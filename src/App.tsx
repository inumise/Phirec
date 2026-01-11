import { useState, useEffect, useRef } from 'react'
import './App.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, User, Mail, Phone, MapPin, Briefcase, Heart, Calendar, Lock, Settings, LogOut, Download, Trash2, Volume2, VolumeX, CheckCircle, Globe } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

type Page = 'main' | 'success' | 'admin-login' | 'admin'
type Language = 'fil' | 'en'

const translations = {
  fil: {
    siteTitle: 'Recruitment Philippines',
    siteSubtitle: 'Ang Inyong Daan sa Pandaigdigang Oportunidad',
    heroTitle: 'Simulan ang Inyong Pandaigdigang Karera',
    heroSubtitle: 'Isumite ang inyong aplikasyon at buksan ang mga pinto sa mga oportunidad sa buong mundo',
    personalInfo: 'Personal na Impormasyon',
    fullName: 'Buong Pangalan',
    email: 'Email Address',
    phone: 'Numero ng Telepono',
    birthdate: 'Petsa ng Kapanganakan',
    address: 'Tirahan',
    nationality: 'Nasyonalidad',
    civilStatus: 'Katayuang Sibil',
    uploadCV: 'I-upload ang CV Document',
    uploadDesc: 'PDF, DOC, o DOCX (Max 5MB)',
    chooseFile: 'Pumili ng File',
    motivationLetter: 'Motivation Letter',
    motivationDesc: 'Sabihin sa amin kung bakit gusto ninyong magtrabaho sa ibang bansa (300 characters)',
    charactersRemaining: 'characters na natitira',
    submit: 'Isumite ang Aplikasyon',
    submitting: 'Isinusumite...',
    successTitle: 'Salamat Po!',
    successMessage: 'Natanggap na ang inyong aplikasyon. Makikipag-ugnayan kami sa inyo sa loob ng 3-5 araw ng negosyo.',
    backToHome: 'Bumalik sa Home',
    footer: '© 2026 Recruitment Philippines. Lahat ng karapatan ay nakalaan.',
    servingFilipinos: 'Naglilingkod sa mga Manggagawang Pilipino sa Buong Mundo',
    adminLogin: 'Admin Portal',
    secureAccess: 'Secure Access Lamang',
    username: 'Username',
    password: 'Password',
    login: 'Mag-login',
    single: 'Walang Asawa',
    married: 'May Asawa',
    divorced: 'Hiwalay',
    widowed: 'Biyudo/Biyuda',
    fileSelected: 'Napili ang File',
    requiredField: 'Kinakailangan'
  },
  en: {
    siteTitle: 'Recruitment Philippines',
    siteSubtitle: 'Your Gateway to Global Opportunities',
    heroTitle: 'Start Your Global Career',
    heroSubtitle: 'Submit your application and open doors to opportunities worldwide',
    personalInfo: 'Personal Information',
    fullName: 'Full Name',
    email: 'Email Address',
    phone: 'Phone Number',
    birthdate: 'Date of Birth',
    address: 'Address',
    nationality: 'Nationality',
    civilStatus: 'Civil Status',
    uploadCV: 'Upload CV Document',
    uploadDesc: 'PDF, DOC, or DOCX (Max 5MB)',
    chooseFile: 'Choose File',
    motivationLetter: 'Motivation Letter',
    motivationDesc: 'Tell us why you want to work abroad (300 characters)',
    charactersRemaining: 'characters remaining',
    submit: 'Submit Application',
    submitting: 'Submitting...',
    successTitle: 'Thank You!',
    successMessage: 'Your application has been received. We will contact you within 3-5 business days.',
    backToHome: 'Back to Home',
    footer: '© 2026 Recruitment Philippines. All rights reserved.',
    servingFilipinos: 'Serving Filipino Workers Worldwide',
    adminLogin: 'Admin Portal',
    secureAccess: 'Secure Access Only',
    username: 'Username',
    password: 'Password',
    login: 'Login',
    single: 'Single',
    married: 'Married',
    divorced: 'Divorced',
    widowed: 'Widowed',
    fileSelected: 'File Selected',
    requiredField: 'Required'
  }
}

interface FormData {
  fullName: string
  email: string
  phone: string
  birthdate: string
  address: string
  nationality: string
  civilStatus: string
  motivationLetter: string
}

interface Submission {
  id: string
  full_name: string
  email: string
  phone: string
  birthdate: string
  address: string
  nationality: string
  civil_status: string
  motivation_letter: string
  file_name: string | null
  file_type: string | null
  created_at: string
  status: string
}

interface SiteSettings {
  site_title: string
  site_subtitle: string
  contact_email: string
  contact_phone: string
  music_enabled: string
  music_volume: string
  sendgrid_from_email: string
  notification_email: string
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('main')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    birthdate: '',
    address: '',
    nationality: 'Filipino',
    civilStatus: 'single',
    motivationLetter: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [adminToken, setAdminToken] = useState<string | null>(localStorage.getItem('adminToken'))
  const [loginData, setLoginData] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [adminTab, setAdminTab] = useState<'submissions' | 'settings'>('submissions')
  const [settings, setSettings] = useState<SiteSettings>({
    site_title: 'Recruitment Philippines',
    site_subtitle: 'Your Gateway to Global Opportunities',
    contact_email: '',
    contact_phone: '',
    music_enabled: 'true',
    music_volume: '0.3',
    sendgrid_from_email: '',
    notification_email: ''
  })
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [musicMuted, setMusicMuted] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [language, setLanguage] = useState<Language>('fil')
  const t = translations[language]

  const MOTIVATION_MAX = 300

  useEffect(() => {
    const audio = new Audio('https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3')
    audio.loop = true
    audio.volume = 0.3
    audioRef.current = audio
    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) {
      if (musicPlaying && !musicMuted) {
        audioRef.current.play().catch(() => {})
      } else {
        audioRef.current.pause()
      }
    }
  }, [musicPlaying, musicMuted])

  useEffect(() => {
    fetchPublicSettings()
  }, [])

  useEffect(() => {
    if (adminToken && currentPage === 'admin') {
      fetchSubmissions()
      fetchSettings()
    }
  }, [adminToken, currentPage])

  const fetchPublicSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings/public`)
      if (res.ok) {
        const data = await res.json()
        setSettings(prev => ({ ...prev, ...data }))
        if (data.music_enabled === 'true') {
          setMusicPlaying(true)
        }
      }
    } catch (error) {
      console.log('Using default settings')
    }
  }

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/submissions`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSubmissions(data)
      }
    } catch (error) {
      console.error('Failed to fetch submissions')
    }
  }

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/settings`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSettings(prev => ({ ...prev, ...data }))
      }
    } catch (error) {
      console.error('Failed to fetch settings')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCvFile(e.target.files[0])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === 'motivationLetter' && value.length > MOTIVATION_MAX) return
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cvFile) {
      alert(language === 'fil' ? 'Mangyaring mag-upload ng CV document' : 'Please upload a CV document')
      return
    }
    if (formData.motivationLetter.length < 50) {
      alert(language === 'fil' ? 'Mangyaring magsulat ng mas mahabang motivation letter (minimum 50 characters)' : 'Please write a longer motivation letter (minimum 50 characters)')
      return
    }
    
    setIsSubmitting(true)
    try {
      const formDataObj = new FormData()
      formDataObj.append('cv', cvFile)
      formDataObj.append('fullName', formData.fullName)
      formDataObj.append('email', formData.email)
      formDataObj.append('phone', formData.phone)
      formDataObj.append('birthdate', formData.birthdate)
      formDataObj.append('address', formData.address)
      formDataObj.append('nationality', formData.nationality)
      formDataObj.append('civilStatus', formData.civilStatus)
      formDataObj.append('motivationLetter', formData.motivationLetter)
      
      await fetch(`${API_URL}/api/cv/upload`, {
        method: 'POST',
        body: formDataObj
      })
      setCurrentPage('success')
    } catch (error) {
      console.error('Submission failed')
      alert(language === 'fil' ? 'Nabigo ang pagsusumite. Pakisubukan muli.' : 'Submission failed. Please try again.')
    }
    setIsSubmitting(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      })
      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('adminToken', data.token)
        setAdminToken(data.token)
        setCurrentPage('admin')
      } else {
        setLoginError('Invalid credentials')
      }
    } catch (error) {
      setLoginError('Login failed')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    setAdminToken(null)
    setCurrentPage('main')
  }

  const handleDeleteSubmission = async (id: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return
    try {
      await fetch(`${API_URL}/api/admin/submissions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      fetchSubmissions()
      setSelectedSubmission(null)
    } catch (error) {
      console.error('Delete failed')
    }
  }

  const handleDownloadFile = async (id: string, fileName: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/submissions/${id}/download`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Download failed')
    }
  }

  const handleExportCSV = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/export/csv`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'cv_submissions.csv'
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export failed')
    }
  }

  const handleSaveSettings = async () => {
    try {
      await fetch(`${API_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify(settings)
      })
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Save settings failed')
    }
  }

  const toggleMusic = () => {
    setMusicMuted(!musicMuted)
    if (musicMuted && audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
  }

  const resetForm = () => {
    setCurrentPage('main')
    setCvFile(null)
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      birthdate: '',
      address: '',
      nationality: 'Filipino',
      civilStatus: 'single',
      motivationLetter: ''
    })
  }

  const MusicControl = () => (
    <button
      onClick={toggleMusic}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center shadow-lg shadow-black/30 hover:shadow-xl hover:scale-105 transition-all duration-300 border border-amber-500/30"
      title={musicMuted ? 'Play Music' : 'Mute Music'}
    >
      {musicMuted ? <VolumeX className="h-5 w-5 text-gray-500" /> : <Volume2 className="h-5 w-5 text-amber-500" />}
    </button>
  )

  const LanguageToggle = () => (
    <button
      onClick={() => setLanguage(language === 'fil' ? 'en' : 'fil')}
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-amber-500/40 hover:border-amber-500 transition-all duration-300 text-white hover:text-amber-400 text-sm font-medium bg-gray-800/80 hover:bg-gray-800"
    >
      <Globe className="h-4 w-4" />
      <span>{language === 'fil' ? 'Filipino' : 'English'}</span>
    </button>
  )

  const Header = () => (
    <header className="py-5 px-6 md:px-16 flex justify-between items-center border-b border-amber-500/20 bg-gradient-to-b from-gray-900 to-black">
      <button onClick={() => setCurrentPage('main')} className="flex items-center gap-4 hover:opacity-90 transition-all duration-300">
        <div className="w-11 h-11 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
          <Briefcase className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-amber-500 text-lg font-semibold tracking-tight">{t.siteTitle}</h1>
          <p className="text-white/60 text-xs tracking-wide">{t.siteSubtitle}</p>
        </div>
      </button>
      <div className="flex items-center gap-4">
        <LanguageToggle />
        <Button variant="ghost" onClick={() => setCurrentPage('admin-login')} className="text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 transition-all duration-300">
          <Lock className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )

  const Footer = () => (
    <footer className="py-8 px-6 md:px-16 border-t border-amber-500/20 text-center bg-gradient-to-b from-black to-gray-900">
      <div className="flex items-center justify-center gap-3 mb-3">
        <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-500/50" />
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60" />
        <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-500/50" />
      </div>
      <p className="text-white/70 text-sm">{t.footer}</p>
      <p className="text-amber-500/50 text-xs mt-1 tracking-wide">{t.servingFilipinos}</p>
    </footer>
  )

  if (currentPage === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <Card className="bg-gray-900 border border-amber-500/30 shadow-xl shadow-black/50 max-w-md w-full text-center">
            <CardContent className="p-10">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl text-amber-500 font-semibold mb-3">{t.successTitle}</h2>
              <p className="text-white/70 mb-8">{t.successMessage}</p>
              <Button onClick={resetForm} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium px-8 py-2.5 rounded-xl transition-all duration-300 shadow-lg shadow-amber-500/30">
                {t.backToHome}
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
        <MusicControl />
      </div>
    )
  }

  if (currentPage === 'admin-login') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center px-4">
        <Card className="bg-gray-900 border border-amber-500/30 shadow-xl shadow-black/50 w-full max-w-sm">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-xl text-amber-500">{t.adminLogin}</CardTitle>
            <p className="text-white/50 text-sm mt-1">{t.secureAccess}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-white/70 text-sm">{t.username}</Label>
                <Input id="username" value={loginData.username} onChange={(e) => setLoginData({ ...loginData, username: e.target.value })} className="bg-gray-800 border-amber-500/30 focus:border-amber-500 focus:ring-amber-500/20 text-white" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white/70 text-sm">{t.password}</Label>
                <Input id="password" type="password" value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} className="bg-gray-800 border-amber-500/30 focus:border-amber-500 focus:ring-amber-500/20 text-white" required />
              </div>
              {loginError && <p className="text-amber-400 text-sm bg-amber-500/10 p-3 rounded-lg border border-amber-500/30">{loginError}</p>}
              <Button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium shadow-lg shadow-amber-500/30 transition-all duration-300">{t.login}</Button>
              <Button type="button" variant="outline" onClick={() => setCurrentPage('main')} className="w-full bg-transparent border-amber-500/30 text-white/70 hover:bg-amber-500/10 hover:text-white transition-all duration-300">{t.backToHome}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (currentPage === 'admin' && adminToken) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <header className="bg-gradient-to-b from-gray-900 to-black py-5 px-6 md:px-10 flex justify-between items-center border-b border-amber-500/20">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-amber-500 text-lg font-semibold">Admin Panel</h1>
              <p className="text-white/50 text-xs">Manage Applications</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant={adminTab === 'submissions' ? 'default' : 'outline'} onClick={() => setAdminTab('submissions')} className={adminTab === 'submissions' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30' : 'border-amber-500/30 text-white/70 hover:bg-amber-500/10'}>
              <FileText className="h-4 w-4 mr-2" /> Submissions
            </Button>
            <Button variant={adminTab === 'settings' ? 'default' : 'outline'} onClick={() => setAdminTab('settings')} className={adminTab === 'settings' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30' : 'border-amber-500/30 text-white/70 hover:bg-amber-500/10'}>
              <Settings className="h-4 w-4 mr-2" /> Settings
            </Button>
            <Button variant="outline" onClick={handleLogout} className="border-amber-500/30 text-white/70 hover:bg-amber-500/10 transition-all duration-300">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="p-6 md:p-10">
          {adminTab === 'submissions' && (
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 bg-gray-900 border border-amber-500/30 shadow-xl shadow-black/50">
                <CardHeader className="flex flex-row items-center justify-between border-b border-amber-500/20 pb-4">
                  <CardTitle className="text-lg text-amber-500 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-amber-500" />
                    Applications ({submissions.length})
                  </CardTitle>
                  <Button onClick={handleExportCSV} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30 transition-all duration-300">
                    <Download className="h-4 w-4 mr-2" /> Export CSV
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-96 overflow-y-auto">
                    {submissions.length === 0 ? (
                      <p className="text-white/50 text-center py-8">No applications yet</p>
                    ) : (
                      submissions.map((sub) => (
                        <div key={sub.id} onClick={() => setSelectedSubmission(sub)} className={`p-4 border-b border-amber-500/10 cursor-pointer hover:bg-amber-500/5 transition-all ${selectedSubmission?.id === sub.id ? 'bg-amber-500/10' : ''}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white font-medium">{sub.full_name}</p>
                              <p className="text-white/50 text-sm">{sub.email}</p>
                            </div>
                            <span className="text-amber-500/70 text-xs">{new Date(sub.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border border-amber-500/30 shadow-xl shadow-black/50">
                <CardHeader className="border-b border-amber-500/20 pb-4">
                  <CardTitle className="text-lg text-amber-500">Details</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {selectedSubmission ? (
                    <div className="space-y-3 text-sm">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-amber-500/20">
                        <span className="text-amber-400/70">Name:</span> <span className="text-white">{selectedSubmission.full_name}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-amber-500/20">
                        <span className="text-amber-400/70">Email:</span> <span className="text-white">{selectedSubmission.email}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-amber-500/20">
                        <span className="text-amber-400/70">Phone:</span> <span className="text-white">{selectedSubmission.phone}</span>
                      </div>
                      {selectedSubmission.birthdate && (
                        <div className="p-3 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-amber-500/20">
                          <span className="text-amber-400/70">Birthdate:</span> <span className="text-white">{selectedSubmission.birthdate}</span>
                        </div>
                      )}
                      {selectedSubmission.nationality && (
                        <div className="p-3 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-amber-500/20">
                          <span className="text-amber-400/70">Nationality:</span> <span className="text-white">{selectedSubmission.nationality}</span>
                        </div>
                      )}
                      {selectedSubmission.civil_status && (
                        <div className="p-3 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-amber-500/20">
                          <span className="text-amber-400/70">Civil Status:</span> <span className="text-white capitalize">{selectedSubmission.civil_status}</span>
                        </div>
                      )}
                      {selectedSubmission.motivation_letter && (
                        <div className="p-3 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-amber-500/20">
                          <span className="text-amber-400/70 block mb-1">Motivation:</span>
                          <span className="text-white text-xs">{selectedSubmission.motivation_letter}</span>
                        </div>
                      )}
                      {selectedSubmission.file_name && (
                        <div className="p-3 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-amber-500/20 flex items-center justify-between">
                          <div><span className="text-amber-400/70 text-sm">File:</span> <span className="text-white">{selectedSubmission.file_name}</span></div>
                          <Button size="sm" className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md transition-all duration-300" onClick={() => handleDownloadFile(selectedSubmission.id, selectedSubmission.file_name!)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => handleDeleteSubmission(selectedSubmission.id)} className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10">
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-white/50 text-center py-8">Select an application to view details</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {adminTab === 'settings' && (
            <Card className="bg-gray-900 border border-amber-500/30 shadow-xl shadow-black/50 max-w-2xl">
              <CardHeader className="border-b border-amber-500/20 pb-4">
                <CardTitle className="text-lg text-amber-500 flex items-center gap-2">
                  <Settings className="h-5 w-5" /> Site Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-sm">Site Title</Label>
                    <Input value={settings.site_title} onChange={(e) => setSettings({ ...settings, site_title: e.target.value })} className="bg-gray-800 border-amber-500/30 focus:border-amber-500 focus:ring-amber-500/20 text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-sm">Site Subtitle</Label>
                    <Input value={settings.site_subtitle} onChange={(e) => setSettings({ ...settings, site_subtitle: e.target.value })} className="bg-gray-800 border-amber-500/30 focus:border-amber-500 focus:ring-amber-500/20 text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-sm">Contact Email</Label>
                    <Input value={settings.contact_email} onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })} className="bg-gray-800 border-amber-500/30 focus:border-amber-500 focus:ring-amber-500/20 text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-sm">Contact Phone</Label>
                    <Input value={settings.contact_phone} onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })} className="bg-gray-800 border-amber-500/30 focus:border-amber-500 focus:ring-amber-500/20 text-white" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-sm">Background Music</Label>
                    <select value={settings.music_enabled} onChange={(e) => setSettings({ ...settings, music_enabled: e.target.value })} className="w-full p-2.5 bg-gray-800 border border-amber-500/30 rounded-lg focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-white text-sm transition-all duration-200">
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-sm">Music Volume (0-1)</Label>
                    <Input type="number" min="0" max="1" step="0.1" value={settings.music_volume} onChange={(e) => setSettings({ ...settings, music_volume: e.target.value })} className="bg-gray-800 border-amber-500/30 focus:border-amber-500 focus:ring-amber-500/20 text-white" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-sm">SendGrid From Email</Label>
                    <Input value={settings.sendgrid_from_email} onChange={(e) => setSettings({ ...settings, sendgrid_from_email: e.target.value })} className="bg-gray-800 border-amber-500/30 focus:border-amber-500 focus:ring-amber-500/20 text-white" placeholder="noreply@yourdomain.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70 text-sm">Notification Email</Label>
                    <Input value={settings.notification_email} onChange={(e) => setSettings({ ...settings, notification_email: e.target.value })} className="bg-gray-800 border-amber-500/30 focus:border-amber-500 focus:ring-amber-500/20 text-white" placeholder="admin@yourdomain.com" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium px-6 shadow-lg shadow-amber-500/30 transition-all duration-300">
                    <CheckCircle className="h-4 w-4 mr-2" /> Save Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex flex-col">
      <Header />
      
      <main className="flex-1 px-4 md:px-16 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-amber-500 mb-3">{t.heroTitle}</h1>
            <p className="text-white/60 text-lg">{t.heroSubtitle}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <Card className="bg-gray-900 border border-amber-500/30 shadow-xl shadow-black/50 mb-8">
              <CardHeader className="border-b border-amber-500/20">
                <CardTitle className="text-xl text-amber-500 flex items-center gap-3">
                  <User className="h-5 w-5" />
                  {t.personalInfo}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-white/70 text-sm flex items-center gap-2">
                      <User className="h-4 w-4 text-amber-500/70" />
                      {t.fullName} <span className="text-amber-500">*</span>
                    </Label>
                    <Input id="fullName" name="fullName" value={formData.fullName} onChange={handleInputChange} required className="bg-gray-800 border-amber-500/30 focus:border-amber-500 focus:ring-amber-500/20 text-white placeholder:text-white/30" placeholder="Juan Dela Cruz" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/70 text-sm flex items-center gap-2">
                      <Mail className="h-4 w-4 text-amber-500/70" />
                      {t.email} <span className="text-amber-500">*</span>
                    </Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required className="bg-gray-800 border-amber-500/30 focus:border-amber-500 focus:ring-amber-500/20 text-white placeholder:text-white/30" placeholder="juan@email.com" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-white/70 text-sm flex items-center gap-2">
                      <Phone className="h-4 w-4 text-amber-500/70" />
                      {t.phone} <span className="text-amber-500">*</span>
                    </Label>
                    <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} required className="bg-gray-800 border-amber-500/30 focus:border-amber-500 focus:ring-amber-500/20 text-white placeholder:text-white/30" placeholder="+63 912 345 6789" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="birthdate" className="text-white/70 text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-amber-500/70" />
                      {t.birthdate} <span className="text-amber-500">*</span>
                    </Label>
                    <Input id="birthdate" name="birthdate" type="date" value={formData.birthdate} onChange={handleInputChange} required className="bg-gray-800 border-amber-500/30 focus:border-amber-500 focus:ring-amber-500/20 text-white" />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address" className="text-white/70 text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-amber-500/70" />
                      {t.address} <span className="text-amber-500">*</span>
                    </Label>
                    <Input id="address" name="address" value={formData.address} onChange={handleInputChange} required className="bg-gray-800 border-amber-500/30 focus:border-amber-500 focus:ring-amber-500/20 text-white placeholder:text-white/30" placeholder="123 Main St, Makati City, Metro Manila" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="nationality" className="text-white/70 text-sm flex items-center gap-2">
                      <Globe className="h-4 w-4 text-amber-500/70" />
                      {t.nationality} <span className="text-amber-500">*</span>
                    </Label>
                    <Input id="nationality" name="nationality" value={formData.nationality} onChange={handleInputChange} required className="bg-gray-800 border-amber-500/30 focus:border-amber-500 focus:ring-amber-500/20 text-white placeholder:text-white/30" placeholder="Filipino" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="civilStatus" className="text-white/70 text-sm flex items-center gap-2">
                      <Heart className="h-4 w-4 text-amber-500/70" />
                      {t.civilStatus} <span className="text-amber-500">*</span>
                    </Label>
                    <select id="civilStatus" name="civilStatus" value={formData.civilStatus} onChange={handleInputChange} required className="w-full p-2.5 bg-gray-800 border border-amber-500/30 rounded-lg focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-white text-sm transition-all duration-200">
                      <option value="single">{t.single}</option>
                      <option value="married">{t.married}</option>
                      <option value="divorced">{t.divorced}</option>
                      <option value="widowed">{t.widowed}</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border border-amber-500/30 shadow-xl shadow-black/50 mb-8">
              <CardHeader className="border-b border-amber-500/20">
                <CardTitle className="text-xl text-amber-500 flex items-center gap-3">
                  <Upload className="h-5 w-5" />
                  {t.uploadCV} <span className="text-amber-500">*</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="border-2 border-dashed border-amber-500/30 rounded-xl p-8 text-center hover:border-amber-500/50 transition-all duration-300">
                  {cvFile ? (
                    <div className="space-y-4">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-xl flex items-center justify-center border border-amber-500/30">
                        <FileText className="h-8 w-8 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-amber-400 font-medium">{t.fileSelected}</p>
                        <p className="text-white/70 text-sm mt-1">{cvFile.name}</p>
                      </div>
                      <label className="cursor-pointer">
                        <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
                        <span className="inline-block text-amber-500 hover:text-amber-400 text-sm underline transition-colors">{language === 'fil' ? 'Palitan ang File' : 'Change File'}</span>
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-xl flex items-center justify-center border border-amber-500/30">
                        <Upload className="h-8 w-8 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-white/70 text-sm">{t.uploadDesc}</p>
                      </div>
                      <label className="cursor-pointer">
                        <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
                        <span className="inline-block bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium px-6 py-2.5 rounded-xl transition-all duration-300 shadow-lg shadow-amber-500/30">{t.chooseFile}</span>
                      </label>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border border-amber-500/30 shadow-xl shadow-black/50 mb-8">
              <CardHeader className="border-b border-amber-500/20">
                <CardTitle className="text-xl text-amber-500 flex items-center gap-3">
                  <FileText className="h-5 w-5" />
                  {t.motivationLetter} <span className="text-amber-500">*</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-white/60 text-sm mb-4">{t.motivationDesc}</p>
                <Textarea
                  name="motivationLetter"
                  value={formData.motivationLetter}
                  onChange={handleInputChange}
                  required
                  rows={5}
                  className="bg-gray-800 border-amber-500/30 focus:border-amber-500 focus:ring-amber-500/20 text-white placeholder:text-white/30 resize-none"
                  placeholder={language === 'fil' ? 'Isulat ang inyong motivation letter dito...' : 'Write your motivation letter here...'}
                />
                <div className="flex justify-end mt-2">
                  <span className={`text-sm ${formData.motivationLetter.length > MOTIVATION_MAX - 50 ? 'text-amber-500' : 'text-white/50'}`}>
                    {MOTIVATION_MAX - formData.motivationLetter.length} {t.charactersRemaining}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold px-12 py-4 rounded-xl transition-all duration-300 shadow-lg shadow-amber-500/30 hover:shadow-xl text-lg">
                {isSubmitting ? t.submitting : t.submit}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
      <MusicControl />
    </div>
  )
}

export default App
