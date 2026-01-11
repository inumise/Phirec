import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sgMail from '@sendgrid/mail';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../dist')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const JWT_SECRET = process.env.JWT_SECRET || 'recruitment-philippines-secret-key-2026';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Mariot54';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync('Mariot54', 10);

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, and DOCX are allowed.'));
    }
  }
});

interface AuthRequest extends Request {
  user?: { username: string };
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access denied' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }
    req.user = user as { username: string };
    next();
  });
};

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS cv_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        birthdate VARCHAR(50),
        nationality VARCHAR(100),
        civil_status VARCHAR(50),
        motivation_letter TEXT,
        objective TEXT,
        education TEXT,
        experience TEXT,
        skills TEXT,
        references_info TEXT,
        file_name VARCHAR(255),
        file_data BYTEA,
        file_type VARCHAR(100),
        submission_type VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending'
      )
    `);
    
    // Add new columns if they don't exist (for existing databases)
    const alterQueries = [
      `ALTER TABLE cv_submissions ADD COLUMN IF NOT EXISTS birthdate VARCHAR(50)`,
      `ALTER TABLE cv_submissions ADD COLUMN IF NOT EXISTS nationality VARCHAR(100)`,
      `ALTER TABLE cv_submissions ADD COLUMN IF NOT EXISTS civil_status VARCHAR(50)`,
      `ALTER TABLE cv_submissions ADD COLUMN IF NOT EXISTS motivation_letter TEXT`
    ];
    for (const query of alterQueries) {
      try { await client.query(query); } catch (e) { /* column may already exist */ }
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const defaultSettings = [
      ['site_title', 'Recruitment Philippines'],
      ['site_subtitle', 'Your Gateway to Global Opportunities'],
      ['welcome_title_filipino', 'Maligayang Pagdating!'],
      ['welcome_title_english', 'Welcome to Recruitment Philippines'],
      ['contact_email', ''],
      ['contact_phone', ''],
      ['music_enabled', 'true'],
      ['music_volume', '0.3'],
      ['sendgrid_from_email', ''],
      ['notification_email', '']
    ];

    for (const [key, value] of defaultSettings) {
      await client.query(`
        INSERT INTO site_settings (setting_key, setting_value)
        VALUES ($1, $2)
        ON CONFLICT (setting_key) DO NOTHING
      `, [key, value]);
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  } finally {
    client.release();
  }
}

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (username !== ADMIN_USERNAME) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/cv/upload', upload.single('cv'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const id = uuidv4();
    const { fullName, email, phone, birthdate, address, nationality, civilStatus, motivationLetter } = req.body;
    
    await pool.query(`
      INSERT INTO cv_submissions (id, full_name, email, phone, birthdate, address, nationality, civil_status, motivation_letter, file_name, file_data, file_type, submission_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'upload')
    `, [id, fullName || 'Unknown', email || '', phone || '', birthdate || '', address || '', nationality || '', civilStatus || '', motivationLetter || '', file.originalname, file.buffer, file.mimetype]);

    await sendNotificationEmail(fullName || 'Unknown', email || '', 'upload');

    res.json({ success: true, id, message: 'Application submitted successfully' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

app.post('/api/cv/submit', async (req: Request, res: Response) => {
  try {
    const { fullName, email, phone, address, objective, education, experience, skills, references } = req.body;

    const id = uuidv4();
    await pool.query(`
      INSERT INTO cv_submissions (id, full_name, email, phone, address, objective, education, experience, skills, references_info, submission_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'form')
    `, [id, fullName, email, phone, address, objective, education, experience, skills, references]);

    await sendNotificationEmail(fullName, email, 'form');

    res.json({ success: true, id, message: 'CV submitted successfully' });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: 'Failed to submit CV' });
  }
});

app.get('/api/admin/submissions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, full_name, email, phone, address, birthdate, nationality, civil_status, motivation_letter,
             objective, education, experience, skills, references_info, 
             file_name, file_type, submission_type, created_at, status
      FROM cv_submissions
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

app.get('/api/admin/submissions/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT * FROM cv_submissions WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fetch submission error:', error);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

app.get('/api/admin/submissions/:id/download', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT file_name, file_data, file_type FROM cv_submissions WHERE id = $1
    `, [id]);

    if (result.rows.length === 0 || !result.rows[0].file_data) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const { file_name, file_data, file_type } = result.rows[0];
    res.setHeader('Content-Type', file_type);
    res.setHeader('Content-Disposition', `attachment; filename="${file_name}"`);
    res.send(file_data);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

app.get('/api/admin/export/csv', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT full_name, email, phone, birthdate, address, nationality, civil_status, motivation_letter,
             objective, education, experience, skills, references_info, 
             submission_type, created_at, status
      FROM cv_submissions
      ORDER BY created_at DESC
    `);

    const headers = ['Full Name', 'Email', 'Phone', 'Birthdate', 'Address', 'Nationality', 'Civil Status', 'Motivation Letter', 'Objective', 'Education', 'Experience', 'Skills', 'References', 'Type', 'Date', 'Status'];
    const csvRows = [headers.join(',')];

    for (const row of result.rows) {
      const values = [
        row.full_name,
        row.email,
        row.phone,
        row.birthdate,
        row.address,
        row.nationality,
        row.civil_status,
        row.motivation_letter,
        row.objective,
        row.education,
        row.experience,
        row.skills,
        row.references_info,
        row.submission_type,
        row.created_at,
        row.status
      ].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`);
      csvRows.push(values.join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="cv_submissions.csv"');
    res.send(csvRows.join('\n'));
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

app.patch('/api/admin/submissions/:id/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await pool.query(`
      UPDATE cv_submissions SET status = $1 WHERE id = $2
    `, [status, id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.delete('/api/admin/submissions/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM cv_submissions WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

app.get('/api/admin/settings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`SELECT setting_key, setting_value FROM site_settings`);
    const settings: Record<string, string> = {};
    for (const row of result.rows) {
      settings[row.setting_key] = row.setting_value;
    }
    res.json(settings);
  } catch (error) {
    console.error('Fetch settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/admin/settings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(`
        INSERT INTO site_settings (setting_key, setting_value, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP
      `, [key, value]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

app.get('/api/settings/public', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT setting_key, setting_value FROM site_settings 
      WHERE setting_key NOT LIKE 'sendgrid%' AND setting_key NOT LIKE 'notification%'
    `);
    const settings: Record<string, string> = {};
    for (const row of result.rows) {
      settings[row.setting_key] = row.setting_value;
    }
    res.json(settings);
  } catch (error) {
    console.error('Fetch public settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

async function sendNotificationEmail(applicantName: string, applicantEmail: string, type: string) {
  if (!process.env.SENDGRID_API_KEY) return;

  try {
    const settingsResult = await pool.query(`
      SELECT setting_key, setting_value FROM site_settings 
      WHERE setting_key IN ('sendgrid_from_email', 'notification_email')
    `);
    
    const settings: Record<string, string> = {};
    for (const row of settingsResult.rows) {
      settings[row.setting_key] = row.setting_value;
    }

    if (!settings.sendgrid_from_email || !settings.notification_email) return;

    await sgMail.send({
      to: settings.notification_email,
      from: settings.sendgrid_from_email,
      subject: `New CV Submission - ${applicantName}`,
      html: `
        <h2>New CV Submission</h2>
        <p><strong>Applicant:</strong> ${applicantName}</p>
        <p><strong>Email:</strong> ${applicantEmail}</p>
        <p><strong>Type:</strong> ${type === 'upload' ? 'Document Upload' : 'Form Submission'}</p>
        <p>Please log in to the admin panel to view the full details.</p>
      `
    });
  } catch (error) {
    console.error('Email notification error:', error);
  }
}

app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

export default app;
