/**
 * Internationalization dictionary for TrailSafe (English & Hindi)
 */

export type Language = 'en' | 'hi'

export interface TranslationDict {
  // Navigation & General
  navOverview: string
  navTourist: string
  navAuthority: string
  navControlRoom: string
  liveStatusOnline: string
  liveStatusOffline: string
  queuedItems: string
  languageLabel: string
  refresh: string
  refreshing: string

  // Tourist Dashboard
  touristTitle: string
  touristSubtitle: string
  demoDisclaimerTourist: string
  touristProfile: string
  travelerId: string
  travelerName: string
  emergencyContact: string
  bloodGroup: string
  medicalNotes: string
  tripStatus: string
  tripNotStarted: string
  tripActive: string
  tripCompleted: string
  startTrip: string
  endTrip: string
  elapsedTime: string

  // Safety Status
  safetyStatus: string
  safe: string
  caution: string
  critical: string
  activeSos: string
  noActiveSos: string
  recentIncidents: string
  lastEvent: string

  // SOS Panel & Modal
  emergencySos: string
  sosDescription: string
  triggerSos: string
  sendingSos: string
  dismissSos: string
  resolveIncident: string
  resolving: string
  sosActiveWarning: string
  sosDuplicateNotice: string
  sosModalTitle: string
  sosModalDesc: string
  sosModalSimWarning: string
  cancel: string
  confirmSos: string

  // Simulators & Geolocation
  safetySimulators: string
  simulateRiskyZone: string
  simulateDeviation: string
  resetDemo: string
  currentLocation: string
  accuracy: string
  updateLocation: string
  requestGps: string
  gpsActive: string
  gpsSimulated: string
  geofenceZone: string

  // Authority Dashboard
  authorityTitle: string
  authoritySubtitle: string
  demoDisclaimerAuthority: string
  viewCombined: string
  viewMapFocus: string
  viewTableFocus: string
  analyticsBtn: string
  respondersBtn: string

  // Metrics
  totalIncidents: string
  openIncidents: string
  criticalIncidents: string
  assignedIncidents: string
  resolvedIncidents: string

  // Filters & Table
  searchPlaceholder: string
  filterAll: string
  filterOpen: string
  filterAssigned: string
  filterClosed: string
  filterCritical: string
  filterHigh: string
  filterMedium: string
  filterLow: string
  sortBy: string
  sortNewest: string
  sortOldest: string
  sortRiskHigh: string
  sortRiskLow: string
  tableId: string
  tableTourist: string
  tableType: string
  tableSeverity: string
  tableRisk: string
  tableStatus: string
  tableResponder: string
  tableTime: string
  tableActions: string
  inspectBtn: string

  // Inspector Modal
  inspectorTitle: string
  riskBreakdown: string
  contributingFactors: string
  auditTimeline: string
  operatorNotes: string
  addNote: string
  notePlaceholder: string
  submittingNote: string
  assignUnit: string
  dispatchBtn: string
  closeIncidentBtn: string
  closureReason: string
  closureNotes: string
  closeModal: string

  // Map & Controls
  liveIncidentMap: string
  geofenceAndRoute: string
  recenterMap: string
  mapLegendTitle: string
  legendCrit: string
  legendHigh: string
  legendMed: string
  legendResp: string
  legendTourist: string
  legendClosed: string
  legendSafeZone: string
  legendCautionZone: string
  legendRestrictedZone: string
  legendTrailRoute: string
  inspectIncidentDetails: string
  filterStatus: string
  filterSeverity: string
  filterType: string
  clearFilters: string
  gpsVerified: string
  syntheticDemo: string
  zoneExitSafe: string
}

export const translations: Record<Language, TranslationDict> = {
  en: {
    navOverview: 'Overview',
    navTourist: 'Tourist App',
    navAuthority: 'Authority Dashboard',
    navControlRoom: 'Control Room',
    liveStatusOnline: 'Live Online',
    liveStatusOffline: 'Offline Mode',
    queuedItems: 'queued',
    languageLabel: 'Language',
    refresh: 'Refresh',
    refreshing: 'Syncing...',

    touristTitle: 'Tourist Safety Interface',
    touristSubtitle: 'Monitor simulated trip progress, test geofencing boundaries, and trigger emergency response simulations.',
    demoDisclaimerTourist: 'DEMO ENVIRONMENT: All traveler profiles, GPS coordinates, geofence breaches, and SOS signals are synthetically simulated for hackathon evaluation. No real emergency services or device sensors are contacted.',
    touristProfile: 'Traveler Profile',
    travelerId: 'Tourist ID',
    travelerName: 'Traveler Name',
    emergencyContact: 'Emergency Contact',
    bloodGroup: 'Blood Group',
    medicalNotes: 'Medical Advisory',
    tripStatus: 'Trip Status',
    tripNotStarted: 'Not Started',
    tripActive: 'Active',
    tripCompleted: 'Completed',
    startTrip: 'Start Monitored Trip',
    endTrip: 'End Monitored Trip',
    elapsedTime: 'Elapsed Time',

    safetyStatus: 'Safety Telemetry',
    safe: 'Safe',
    caution: 'Caution',
    critical: 'Critical',
    activeSos: 'SOS DISTRESS ACTIVE',
    noActiveSos: 'Normal Monitoring',
    recentIncidents: 'Recorded Incidents',
    lastEvent: 'Last System Event',

    emergencySos: 'Emergency SOS Simulator',
    sosDescription: 'Triggers synthetic distress signal to the Authority Control Room with real-time database persistence.',
    triggerSos: 'TRIGGER EMERGENCY SOS',
    sendingSos: 'Transmitting Signal...',
    dismissSos: 'Dismiss Local Alert',
    resolveIncident: 'Resolve / Close Incident in Database',
    resolving: 'Resolving Incident...',
    sosActiveWarning: 'EMERGENCY DISTRESS BEACON ACTIVE',
    sosDuplicateNotice: 'Active SOS incident already open on backend. Retrieved existing record without duplicate.',
    sosModalTitle: 'Simulate Emergency SOS Transmission?',
    sosModalDesc: 'This triggers a high-priority distress incident registered in the SQLite database and alerts the Authority Control Room.',
    sosModalSimWarning: 'SIMULATION ONLY: This does not contact real 112 or police authorities.',
    cancel: 'Cancel',
    confirmSos: 'Confirm Simulated SOS',

    safetySimulators: 'Geofence & Hazard Simulators',
    simulateRiskyZone: 'Simulate Risky-Zone Breach',
    simulateDeviation: 'Simulate Route Deviation',
    resetDemo: 'Reset Demo State',
    currentLocation: 'Current Excursion Waypoint',
    accuracy: 'Accuracy',
    updateLocation: 'Next Lucknow Waypoint',
    requestGps: 'Use Live Device GPS',
    gpsActive: 'Live Device GPS Active',
    gpsSimulated: 'Simulated Heritage Corridor',
    geofenceZone: 'Active Geofence Zone',

    authorityTitle: 'Authority Control Room Dashboard',
    authoritySubtitle: 'Real-time monitoring, triage categorization, explainable risk audit, and simulated responder dispatch for tourist safety incidents.',
    demoDisclaimerAuthority: 'COMMAND ROOM ENVIRONMENT (SIMULATION): All incidents, timestamps, and responder dispatches are retrieved directly from SQLite database via FastAPI. Dispatch actions and responder units are synthetically simulated for hackathon evaluation. No real emergency services or actual police are contacted.',
    viewCombined: 'Map & Feed',
    viewMapFocus: 'Map Focus',
    viewTableFocus: 'Feed Table',
    analyticsBtn: 'Analytics & Insights',
    respondersBtn: 'Patrol Units (5)',

    totalIncidents: 'Total Incidents',
    openIncidents: 'Open Pending',
    criticalIncidents: 'Critical Priority',
    assignedIncidents: 'Dispatched Units',
    resolvedIncidents: 'Resolved / Closed',

    searchPlaceholder: 'Search by ID, tourist, location, description, or unit...',
    filterAll: 'All',
    filterOpen: 'Open',
    filterAssigned: 'Assigned',
    filterClosed: 'Closed',
    filterCritical: 'Critical',
    filterHigh: 'High',
    filterMedium: 'Medium',
    filterLow: 'Low',
    sortBy: 'Sort by',
    sortNewest: 'Newest First',
    sortOldest: 'Oldest First',
    sortRiskHigh: 'Risk Score (High-Low)',
    sortRiskLow: 'Risk Score (Low-High)',
    tableId: 'Incident ID',
    tableTourist: 'Tourist',
    tableType: 'Type',
    tableSeverity: 'Severity',
    tableRisk: 'Risk Score',
    tableStatus: 'Status',
    tableResponder: 'Assigned Unit',
    tableTime: 'Reported',
    tableActions: 'Actions',
    inspectBtn: 'Inspect',

    inspectorTitle: 'Incident Inspector & Risk Audit',
    riskBreakdown: 'Explainable Risk Factors & Audit Trail',
    contributingFactors: 'Contributing Risk Factors',
    auditTimeline: 'Incident Audit Lifecycle Events',
    operatorNotes: 'Control Room Working Notes',
    addNote: 'Append Operator Note',
    notePlaceholder: 'Enter verification note or unit coordination update...',
    submittingNote: 'Saving Note...',
    assignUnit: 'Assign Simulated Patrol Unit',
    dispatchBtn: 'Dispatch Unit',
    closeIncidentBtn: 'Mark Incident as CLOSED',
    closureReason: 'Closure Reason',
    closureNotes: 'Closing Debrief Notes (Optional)',
    closeModal: 'Close Inspector',

    liveIncidentMap: 'LIVE INCIDENT GEOSPATIAL MAP',
    geofenceAndRoute: 'Geofence & Route',
    recenterMap: 'Recenter',
    mapLegendTitle: 'INCIDENT MAP LEGEND',
    legendCrit: 'Active Critical (SOS)',
    legendHigh: 'High (Risky Zone)',
    legendMed: 'Medium (Deviation)',
    legendResp: 'Simulated Responders',
    legendTourist: 'Demo Tourist (TS-DEMO-001)',
    legendClosed: 'Closed / Resolved',
    legendSafeZone: 'Safe Heritage Zone',
    legendCautionZone: 'Caution Buffer Zone',
    legendRestrictedZone: 'Restricted Hazard Zone',
    legendTrailRoute: 'Approved Tourist Corridor',
    inspectIncidentDetails: 'Inspect Incident Details',
    filterStatus: 'Status',
    filterSeverity: 'Severity',
    filterType: 'Type',
    clearFilters: 'Clear All Filters',
    gpsVerified: 'GPS Verified',
    syntheticDemo: 'Synthetic Anchor',
    zoneExitSafe: 'Zone Exit: Returned to Safe Tourist Corridor',
  },
  hi: {
    navOverview: 'अवलोकन',
    navTourist: 'पर्यटक सुरक्षा',
    navAuthority: 'कंट्रोल रूम डैशबोर्ड',
    navControlRoom: 'कंट्रोल रूम',
    liveStatusOnline: 'सक्रिय ऑनलाइन',
    liveStatusOffline: 'ऑफ़लाइन मोड',
    queuedItems: 'कतार में',
    languageLabel: 'भाषा',
    refresh: 'रिफ्रेश',
    refreshing: 'सिंक हो रहा है...',

    touristTitle: 'पर्यटक सुरक्षा इंटरफ़ेस',
    touristSubtitle: 'सिम्युलेटेड यात्रा प्रगति ट्रैक करें, जियोफेंसिंग सीमाओं का परीक्षण करें और आपातकालीन एसओएस प्रतिक्रिया सक्रिय करें।',
    demoDisclaimerTourist: 'डेमो वातावरण: सभी पर्यटक प्रोफ़ाइल, जीपीएस निर्देशांक, जियोफेंस सीमाएं और एसओएस सिग्नल मूल्यांकन के लिए सिम्युलेटेड हैं। किसी वास्तविक पुलिस या 112 सेवा से संपर्क नहीं होता।',
    touristProfile: 'पर्यटक प्रोफ़ाइल',
    travelerId: 'पर्यटक आईडी',
    travelerName: 'पर्यटक का नाम',
    emergencyContact: 'आपातकालीन संपर्क',
    bloodGroup: 'रक्त समूह',
    medicalNotes: 'चिकित्सा सलाह',
    tripStatus: 'यात्रा स्थिति',
    tripNotStarted: 'आरंभ नहीं हुई',
    tripActive: 'सक्रिय यात्रा',
    tripCompleted: 'पूर्ण',
    startTrip: 'सुरक्षित यात्रा शुरू करें',
    endTrip: 'यात्रा समाप्त करें',
    elapsedTime: 'बीता समय',

    safetyStatus: 'सुरक्षा टेलीमेट्री',
    safe: 'सुरक्षित',
    caution: 'सावधानी',
    critical: 'गंभीर संकट',
    activeSos: 'एसओएस संकट सक्रिय',
    noActiveSos: 'सामान्य निगरानी',
    recentIncidents: 'दर्ज घटनाएं',
    lastEvent: 'अंतिम सिस्टम घटना',

    emergencySos: 'आपातकालीन एसओएस सिम्युलेटर',
    sosDescription: 'कंट्रोल रूम को तत्काल संकट सिग्नल भेजता है और डेटाबेस में दर्ज करता है।',
    triggerSos: 'आपातकालीन एसओएस दबाएं',
    sendingSos: 'सिग्नल भेजा जा रहा है...',
    dismissSos: 'स्थानीय अलर्ट हटाएं',
    resolveIncident: 'डेटाबेस में घटना हल करें',
    resolving: 'हल हो रहा है...',
    sosActiveWarning: 'आपातकालीन संकट बीकन सक्रिय है',
    sosDuplicateNotice: 'इस पर्यटक की सक्रिय घटना पहले से मौजूद है। डुप्लिकेट के बिना मौजूदा रिकॉर्ड वापस मिला।',
    sosModalTitle: 'क्या आप एसओएस सिग्नल भेजना चाहते हैं?',
    sosModalDesc: 'यह डेटाबेस में उच्च-प्राथमिकता संकट घटना दर्ज करेगा और कंट्रोल रूम को सूचित करेगा।',
    sosModalSimWarning: 'केवल सिमुलेशन: यह वास्तविक पुलिस या 112 को कॉल नहीं करता।',
    cancel: 'रद्द करें',
    confirmSos: 'एसओएस की पुष्टि करें',

    safetySimulators: 'जियोफेंस और खतरा सिम्युलेटर',
    simulateRiskyZone: 'जोखिम क्षेत्र प्रवेश सिम्युलेट करें',
    simulateDeviation: 'मार्ग विचलन सिम्युलेट करें',
    resetDemo: 'डेमो रीसेट करें',
    currentLocation: 'वर्तमान स्थान बिंदु',
    accuracy: 'सटीकता',
    updateLocation: 'अगला लखनऊ वेपॉइंट',
    requestGps: 'डिवाइस जीपीएस का उपयोग करें',
    gpsActive: 'लाइव जीपीएस सक्रिय',
    gpsSimulated: 'सिम्युलेटेड हेरिटेज कॉरिडोर',
    geofenceZone: 'सक्रिय जियोफेंस क्षेत्र',

    authorityTitle: 'प्राधिकरण कंट्रोल रूम डैशबोर्ड',
    authoritySubtitle: 'पर्यटक सुरक्षा घटनाओं की वास्तविक समय निगरानी, जोखिम मूल्यांकन और सिम्युलेटेड प्रतिक्रिया दल प्रेषण।',
    demoDisclaimerAuthority: 'कंट्रोल रूम वातावरण (सिमुलेशन): सभी घटनाएं और प्रतिक्रिया दल SQLite डेटाबेस से प्राप्त होते हैं। सभी प्रेषण क्रियाएं और दल सिमुलेशन हैं।',
    viewCombined: 'मानचित्र और सूची',
    viewMapFocus: 'मानचित्र दृश्य',
    viewTableFocus: 'तालिका दृश्य',
    analyticsBtn: 'एनालिटिक्स और सांख्यिकी',
    respondersBtn: 'प्रतिक्रिया दल (5)',

    totalIncidents: 'कुल घटनाएं',
    openIncidents: 'लंबित घटनाएं',
    criticalIncidents: 'गंभीर प्राथमिकता',
    assignedIncidents: 'तैनात दल',
    resolvedIncidents: 'हल की गई',

    searchPlaceholder: 'आईडी, पर्यटक, स्थान या दल के नाम से खोजें...',
    filterAll: 'सभी',
    filterOpen: 'खुली',
    filterAssigned: 'सौंपी गई',
    filterClosed: 'बंद',
    filterCritical: 'गंभीर',
    filterHigh: 'उच्च',
    filterMedium: 'मध्यम',
    filterLow: 'निम्न',
    sortBy: 'क्रमबद्ध करें',
    sortNewest: 'नवीनतम पहले',
    sortOldest: 'पुरातन पहले',
    sortRiskHigh: 'जोखिम स्कोर (उच्च से निम्न)',
    sortRiskLow: 'जोखिम स्कोर (निम्न से उच्च)',
    tableId: 'घटना आईडी',
    tableTourist: 'पर्यटक',
    tableType: 'प्रकार',
    tableSeverity: 'गंभीरता',
    tableRisk: 'जोखिम स्कोर',
    tableStatus: 'स्थिति',
    tableResponder: 'सौंपा गया दल',
    tableTime: 'समय',
    tableActions: 'कार्रवाई',
    inspectBtn: 'विवरण देखें',

    inspectorTitle: 'घटना विवरण और जोखिम ऑडिट',
    riskBreakdown: 'स्पष्ट जोखिम कारक और ऑडिट ट्रेल',
    contributingFactors: 'जोखिम के मुख्य कारक',
    auditTimeline: 'घटना ऑडिट जीवनचक्र इतिहास',
    operatorNotes: 'कंट्रोल रूम ऑपरेटर नोट्स',
    addNote: 'नया नोट जोड़ें',
    notePlaceholder: 'सत्यापन विवरण या दल समन्वय नोट लिखें...',
    submittingNote: 'सहेजा जा रहा है...',
    assignUnit: 'प्रतिक्रिया दल नियुक्त करें',
    dispatchBtn: 'दल रवाना करें',
    closeIncidentBtn: 'घटना को CLOSED चिह्नित करें',
    closureReason: 'समाप्ति का कारण',
    closureNotes: 'समाप्ति नोट्स (वैकल्पिक)',
    closeModal: 'बंद करें',

    liveIncidentMap: 'लाइव घटना भू-स्थानिक मानचित्र',
    geofenceAndRoute: 'जियोफेंस और मार्ग',
    recenterMap: 'पुनः केंद्रित करें',
    mapLegendTitle: 'मानचित्र संकेत तालिका',
    legendCrit: 'सक्रिय गंभीर (एसओएस)',
    legendHigh: 'उच्च जोखिम क्षेत्र',
    legendMed: 'मध्यम (मार्ग विचलन)',
    legendResp: 'सिम्युलेटेड प्रतिक्रिया दल',
    legendTourist: 'डेमो पर्यटक (TS-DEMO-001)',
    legendClosed: 'हल / बंद',
    legendSafeZone: 'सुरक्षित हेरिटेज क्षेत्र',
    legendCautionZone: 'सावधानी बफर क्षेत्र',
    legendRestrictedZone: 'प्रतिबंधित खतरा क्षेत्र',
    legendTrailRoute: 'स्वीकृत पर्यटक मार्ग',
    inspectIncidentDetails: 'घटना का विस्तृत विवरण देखें',
    filterStatus: 'स्थिति',
    filterSeverity: 'गंभीरता',
    filterType: 'प्रकार',
    clearFilters: 'सभी फ़िल्टर हटाएं',
    gpsVerified: 'जीपीएस सत्यापित',
    syntheticDemo: 'सिम्युलेटेड डेमो बिंदु',
    zoneExitSafe: 'क्षेत्र निकास: सुरक्षित पर्यटक गलियारे में वापसी',
  },
}
