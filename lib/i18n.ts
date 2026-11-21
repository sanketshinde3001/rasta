// UI strings in English, Hindi and Marathi. Missing keys fall back to English.
import type { Lang } from "./lang";

const D: Record<string, [string, string, string]> = {
  // categories
  "cat.Road surface": ["Road surface", "सड़क की सतह", "रस्त्याचा पृष्ठभाग"],
  "cat.Water & drainage": ["Water & drainage", "पानी और नाली", "पाणी आणि गटार"],
  "cat.Manholes & covers": ["Manholes & covers", "मैनहोल और ढक्कन", "मॅनहोल आणि झाकणे"],
  "cat.Footpath": ["Footpath", "फुटपाथ", "पदपथ"],
  "sub.Pothole": ["Pothole", "गड्ढा", "खड्डा"],
  "sub.Road cave-in": ["Road cave-in", "सड़क धंसना", "रस्ता खचणे"],
  "sub.Broken paver blocks": ["Broken paver blocks", "टूटे पेवर ब्लॉक", "तुटलेले पेव्हर ब्लॉक"],
  "sub.Uneven or damaged road": ["Uneven or damaged road", "ऊबड़-खाबड़ सड़क", "खराब रस्ता"],
  "sub.Waterlogging": ["Waterlogging", "जलभराव", "पाणी साचणे"],
  "sub.Choked drain / nullah overflow": ["Choked drain / nullah overflow", "नाली जाम / नाला ओवरफ़्लो", "गटार तुंबणे / नाला ओसंडणे"],
  "sub.Open or broken manhole": ["Open or broken manhole", "खुला या टूटा मैनहोल", "उघडे किंवा तुटलेले मॅनहोल"],
  "sub.Missing drain cover": ["Missing drain cover", "नाली का ढक्कन ग़ायब", "गटाराचे झाकण गायब"],
  "sub.Broken footpath": ["Broken footpath", "टूटा फुटपाथ", "तुटलेला पदपथ"],
  "sub.Debris or material on footpath": ["Debris on footpath", "फुटपाथ पर मलबा", "पदपथावर राडारोडा"],
  // nav
  "nav.home": ["Home", "होम", "मुख्यपृष्ठ"],
  "nav.map": ["Map", "नक्शा", "नकाशा"],
  "nav.contractors": ["Contractors", "ठेकेदार", "कंत्राटदार"],
  "nav.rights": ["Your rights", "आपके अधिकार", "तुमचे हक्क"],
  "nav.complaints": ["Complaints", "शिकायतें", "तक्रारी"],
  "nav.budget": ["Smart budget", "स्मार्ट बजट", "स्मार्ट बजेट"],
  "nav.tenders": ["Tenders", "टेंडर", "निविदा"],
  "nav.clawback": ["Claw-back", "वसूली", "वसुली"],
  "login": ["Log in", "लॉग इन", "लॉग इन"],
  "ward.office": ["Ward {w} office", "वार्ड {w} कार्यालय", "वॉर्ड {w} कार्यालय"],

  // landing
  "land.title": ["Every rupee spent on Mumbai's roads, accounted for.", "मुंबई की सड़कों पर खर्च हुए हर रुपये का हिसाब।", "मुंबईच्या रस्त्यांवर खर्च झालेल्या प्रत्येक रुपयाचा हिशोब."],
  "land.sub": ["Mumbai already tracks potholes. Nobody tracks who pays when the fix fails. Rasta does.", "मुंबई गड्ढों को ट्रैक करती है। मरम्मत टूटने पर पैसा कौन लौटाए, यह कोई नहीं देखता। रास्ता देखता है।", "मुंबई खड्डे नोंदवते. दुरुस्ती टिकली नाही तर पैसे कोण परत करणार, हे कोणी पाहत नाही. रस्ता पाहतो."],
  "land.continue": ["Continue as", "आगे बढ़ें", "पुढे जा"],
  "land.citizen": ["Citizen", "नागरिक", "नागरिक"],
  "land.citizen.d": ["Report a problem and see where the money went", "समस्या बताएं और देखें पैसा कहां गया", "समस्या नोंदवा आणि पैसा कुठे गेला ते पाहा"],
  "land.officer": ["Ward officer", "वार्ड अधिकारी", "वॉर्ड अधिकारी"],
  "land.officer.d": ["Review complaints, recover money, plan the budget", "शिकायतें देखें, पैसा वसूलें, बजट बनाएं", "तक्रारी तपासा, पैसे वसूल करा, बजेट ठरवा"],
  "land.look": ["Just looking? Open the city map", "सिर्फ़ देखना है? शहर का नक्शा खोलें", "फक्त पाहायचे आहे? शहराचा नकाशा उघडा"],
  "land.spent": ["spent on repairs", "मरम्मत पर खर्च", "दुरुस्तीवर खर्च"],
  "land.recover": ["can be recovered", "वसूल हो सकता है", "वसूल करता येतील"],
  "land.failed": ["didn't last a month", "एक महीना नहीं टिका", "एक महिनाही टिकले नाही"],
  "land.synthetic": ["Prototype for Claude Impact Lab Mumbai. All data is synthetic; contractors are fictional.", "Claude Impact Lab Mumbai के लिए प्रोटोटाइप। सारा डेटा काल्पनिक है।", "Claude Impact Lab Mumbai साठी नमुना. सर्व माहिती काल्पनिक आहे."],

  // citizen home
  "home.hi": ["Namaste, {n}", "नमस्ते, {n}", "नमस्कार, {n}"],
  "home.title": ["Seen a problem on the road?", "सड़क पर कोई समस्या दिखी?", "रस्त्यावर काही समस्या दिसली?"],
  "home.new": ["New registration", "नई शिकायत", "नवीन तक्रार"],
  "home.search": ["Search by grievance ID", "शिकायत ID से खोजें", "तक्रार क्रमांकाने शोधा"],
  "home.track": ["Track your complaints", "अपनी शिकायतें देखें", "तुमच्या तक्रारी पाहा"],
  "home.city": ["Know your city", "अपने शहर को जानें", "तुमचे शहर जाणून घ्या"],
  "home.map.d": ["Complaints and repairs near you", "आपके पास शिकायतें और मरम्मत", "जवळच्या तक्रारी आणि दुरुस्ती"],
  "home.con.d": ["Who fixes your roads, and how well", "आपकी सड़कें कौन ठीक करता है, कितना अच्छा", "तुमचे रस्ते कोण दुरुस्त करते, किती चांगले"],
  "home.rights.d": ["Deadlines, free re-repairs, RTI", "समय सीमा, मुफ़्त मरम्मत, RTI", "मुदत, मोफत दुरुस्ती, RTI"],
  "st.Registered": ["Registered", "दर्ज", "नोंदवली"],
  "st.In progress": ["In progress", "काम जारी", "काम सुरू"],
  "st.Closed": ["Closed", "बंद", "बंद"],
  "st.Invalid": ["Invalid", "अमान्य", "अवैध"],
  "nothing": ["Nothing here.", "यहां कुछ नहीं।", "इथे काही नाही."],

  // form
  "f.title": ["New registration", "नई शिकायत", "नवीन तक्रार"],
  "f.sub": ["Takes about a minute. A photo helps the most.", "लगभग एक मिनट लगेगा। फ़ोटो सबसे ज़्यादा मदद करती है।", "सुमारे एक मिनिट लागेल. फोटो सर्वात उपयोगी."],
  "f.say": ["Just say it", "बस बोलिए", "फक्त बोला"],
  "f.say.d": ["Speak in Hindi, Marathi or English. We fill the form for you.", "हिंदी, मराठी या अंग्रेज़ी में बोलें। फ़ॉर्म हम भरेंगे।", "हिंदी, मराठी किंवा इंग्रजीत बोला. फॉर्म आम्ही भरू."],
  "f.location": ["Location", "स्थान", "ठिकाण"],
  "f.setloc": ["Set location on map", "नक्शे पर स्थान चुनें", "नकाशावर ठिकाण निवडा"],
  "f.finding": ["Finding your location…", "आपका स्थान खोज रहे हैं…", "तुमचे ठिकाण शोधत आहोत…"],
  "f.change": ["Change", "बदलें", "बदला"],
  "f.ward": ["Ward", "वार्ड", "वॉर्ड"],
  "f.auto": ["(auto-captured)", "(अपने आप)", "(आपोआप)"],
  "f.area": ["Area", "इलाका", "परिसर"],
  "f.photo": ["Photo", "फ़ोटो", "फोटो"],
  "f.photo.why": ["(recommended, it is your proof)", "(ज़रूरी, यही आपका सबूत है)", "(आवश्यक, हाच तुमचा पुरावा)"],
  "f.upload": ["Upload / Capture photo", "फ़ोटो अपलोड / खींचें", "फोटो अपलोड / काढा"],
  "f.sample": ["Use a sample photo", "नमूना फ़ोटो लें", "नमुना फोटो वापरा"],
  "f.type": ["Grievance type", "शिकायत का प्रकार", "तक्रारीचा प्रकार"],
  "f.subtype": ["Grievance subtype", "उप-प्रकार", "उप-प्रकार"],
  "f.pickfirst": ["Please select grievance type first", "पहले शिकायत का प्रकार चुनें", "आधी तक्रारीचा प्रकार निवडा"],
  "f.desc": ["Description", "विवरण", "वर्णन"],
  "f.optional": ["(optional)", "(वैकल्पिक)", "(ऐच्छिक)"],
  "f.ack": ["Acknowledgement details", "सूचना कैसे मिले", "सूचना कशी मिळावी"],
  "f.anon": ["Anonymous", "गुमनाम", "निनावी"],
  "f.anon.d": ["(you won't get updates)", "(अपडेट नहीं मिलेंगे)", "(अपडेट मिळणार नाहीत)"],
  "f.email": ["Enter email", "ईमेल लिखें", "ईमेल लिहा"],
  "f.submit": ["Submit complaint", "शिकायत भेजें", "तक्रार पाठवा"],
  "f.reading": ["Reading your photo…", "आपकी फ़ोटो पढ़ रहे हैं…", "तुमचा फोटो वाचत आहोत…"],
  "f.fromphoto": ["Filled from your photo · you can change it", "आपकी फ़ोटो से भरा · आप बदल सकते हैं", "तुमच्या फोटोवरून भरले · तुम्ही बदलू शकता"],
  "f.fromvoice": ["Filled from your voice · you can change it", "आपकी आवाज़ से भरा · आप बदल सकते हैं", "तुमच्या आवाजावरून भरले · तुम्ही बदलू शकता"],
  "f.almost": ["Almost done. Please add:", "बस थोड़ा बाकी। कृपया जोड़ें:", "जवळजवळ झाले. कृपया जोडा:"],

  // complaint page
  "c.registered": ["Registered", "दर्ज हुई", "नोंदवली"],
  "c.checked": ["Checked by ward office", "वार्ड कार्यालय ने जांची", "वॉर्ड कार्यालयाने तपासली"],
  "c.repair": ["Repair work", "मरम्मत का काम", "दुरुस्तीचे काम"],
  "c.fixed": ["Fixed", "ठीक हुआ", "दुरुस्त झाले"],
  "c.who": ["Who fixed it, and what it cost", "किसने ठीक किया, और कितना खर्च हुआ", "कोणी दुरुस्त केले, आणि किती खर्च आला"],
  "c.billed": ["billed", "बिल", "बिल"],
  "c.fair": ["fair price (rate card)", "सही कीमत (रेट कार्ड)", "योग्य किंमत (दर पत्रक)"],
  "c.held": ["held 30 days", "30 दिन टिका", "30 दिवस टिकले"],
  "c.road": ["See this road's full history", "इस सड़क का पूरा इतिहास देखें", "या रस्त्याचा पूर्ण इतिहास पाहा"],
  "c.rti": ["Ask for this bill (RTI)", "इस बिल के लिए RTI करें", "या बिलासाठी RTI करा"],

  // translate
  "tr.to": ["Translate to English", "हिंदी में अनुवाद करें", "मराठीत भाषांतर करा"],
  "tr.orig": ["Show original", "मूल देखें", "मूळ पाहा"],
  "tr.from": ["Translated from {l}", "{l} से अनुवादित", "{l} मधून भाषांतरित"],
  "lang.en": ["English", "अंग्रेज़ी", "इंग्रजी"],
  "lang.hi": ["Hindi", "हिंदी", "हिंदी"],
  "lang.mr": ["Marathi", "मराठी", "मराठी"],
  "lang.hi-en": ["Hinglish", "हिंग्लिश", "हिंग्लिश"],
  "tr.busy": ["Translating…", "अनुवाद हो रहा है…", "भाषांतर होत आहे…"],

  // officer
  "o.complaints": ["Complaints", "शिकायतें", "तक्रारी"],
  "o.review": ["waiting for review", "जांच बाकी", "तपासणी बाकी"],
  "o.high": ["high priority, not fixed", "ज़्यादा ज़रूरी, ठीक नहीं", "तातडीचे, दुरुस्त नाही"],
  "o.overdue": ["past their deadline", "समय सीमा पार", "मुदत संपली"],
  "o.new": ["new from the Rasta app", "रास्ता ऐप से नई", "रस्ता ॲपवरून नवीन"],

  // claw-back
  "cb.title": ["Warranty claw-back desk", "वारंटी वसूली डेस्क", "वॉरंटी वसुली डेस्क"],
  "cb.sub": ["Money the city paid that contractors should return or never have been paid. Every item needs your review before a notice goes out.", "वह पैसा जो ठेकेदारों को लौटाना चाहिए या जो दिया ही नहीं जाना था। नोटिस भेजने से पहले हर मद की जांच ज़रूरी है।", "कंत्राटदारांनी परत करायचे किंवा कधीच द्यायला नको होते ते पैसे. नोटीस पाठवण्यापूर्वी प्रत्येक बाब तुम्ही तपासा."],
  "cb.recoverable": ["recoverable in this ward", "इस वार्ड में वसूली योग्य", "या वॉर्डमध्ये वसूल करण्याजोगे"],
  "cb.city": ["across Mumbai", "पूरी मुंबई में", "संपूर्ण मुंबईत"],
  "cb.dlp": ["Repaired during warranty", "वारंटी में मरम्मत", "वॉरंटीतील दुरुस्ती"],
  "cb.over": ["Billed above rate card", "रेट कार्ड से ज़्यादा बिल", "दरपत्रकापेक्षा जास्त बिल"],
  "cb.ghost": ["Billed twice", "दो बार बिल", "दोनदा बिल"],
  "cb.expiring": ["Warranties ending soon: inspect now", "जल्द ख़त्म होती वारंटी: अभी जांचें", "लवकर संपणारी वॉरंटी: आत्ताच तपासा"],
  "cb.draft": ["Draft recovery notice", "वसूली नोटिस बनाएं", "वसुली नोटीस तयार करा"],
  "cb.review": ["Needs review", "जांच बाकी", "तपासणी बाकी"],
  "cb.approved": ["Reviewed", "जांच हो गई", "तपासले"],
  "cb.sent": ["Notice sent", "नोटिस भेजा", "नोटीस पाठवली"],
};

const IDX: Record<Lang, number> = { en: 0, hi: 1, mr: 2 };

export function tr(lang: Lang) {
  return (key: string, vars?: Record<string, string | number>) => {
    const row = D[key];
    let s = row ? row[IDX[lang]] || row[0] : key.replace(/^(cat|sub|st)\./, "");
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  };
}
