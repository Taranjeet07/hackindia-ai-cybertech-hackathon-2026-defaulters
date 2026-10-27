import { useState, useEffect } from 'react'
import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { FeatureCards } from './components/FeatureCards'
import { FeatureHighlights } from './components/FeatureHighlights'
import { AboutSection } from './components/AboutSection'
import { Footer } from './components/Footer'
import { FeatureModal } from './components/FeatureModal'
import { TouristSafetyView } from './components/tourist/TouristSafetyView'
import { AuthorityDashboardView } from './components/authority/AuthorityDashboardView'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'tourist' | 'authority'>('landing')

  const [modalState, setModalState] = useState<{
    isOpen: boolean
    featureKey: 'tourist' | 'authority'
    title: string
    description: string
  }>({
    isOpen: false,
    featureKey: 'tourist',
    title: '',
    description: '',
  })

  // Synchronize view state with window hash for seamless back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash === '#tourist' || hash === '#tourist-app') {
        setCurrentView('tourist')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else if (hash === '#authority' || hash === '#control-room' || hash === '#dashboard') {
        setCurrentView('authority')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        setCurrentView('landing')
      }
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const handleOpenTouristApp = () => {
    setCurrentView('tourist')
    window.location.hash = '#tourist'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleOpenAuthorityDashboard = () => {
    setCurrentView('authority')
    window.location.hash = '#authority'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBackToOverview = () => {
    setCurrentView('landing')
    window.location.hash = '#overview'
  }

  const handleOpenModal = (
    featureKey: 'tourist' | 'authority',
    title: string,
    description: string
  ) => {
    setModalState({
      isOpen: true,
      featureKey,
      title,
      description,
    })
  }

  const handleCloseModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }))
  }

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Render Tourist Safety View if selected
  if (currentView === 'tourist') {
    return <TouristSafetyView onBackToOverview={handleBackToOverview} />
  }

  // Render Authority Control-Room Dashboard if selected
  if (currentView === 'authority') {
    return (
      <AuthorityDashboardView
        onBackToOverview={handleBackToOverview}
        onOpenTouristApp={handleOpenTouristApp}
      />
    )
  }

  // Otherwise render the Public Safety Landing Page
  return (
    <div className="app-root">
      {/* 1. Navigation Bar */}
      <Navbar
        onOpenTouristApp={handleOpenTouristApp}
        onOpenAuthorityDashboard={handleOpenAuthorityDashboard}
      />

      <main className="main-content">
        {/* 2. Hero Section */}
        <Hero
          onExploreFeatures={() => scrollToSection('features')}
          onViewOverview={() => scrollToSection('overview')}
        />

        {/* 3. Two Feature Cards */}
        <FeatureCards
          onOpenCardAction={handleOpenModal}
          onOpenTouristApp={handleOpenTouristApp}
          onOpenAuthorityDashboard={handleOpenAuthorityDashboard}
        />

        {/* 4. Three Feature Highlights */}
        <FeatureHighlights />

        {/* About Section */}
        <AboutSection />
      </main>

      {/* 5. Footer */}
      <Footer />

      {/* Coming Soon Notification Modal */}
      <FeatureModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        description={modalState.description}
        featureKey={modalState.featureKey}
        onClose={handleCloseModal}
      />
    </div>
  )
}

export default App
