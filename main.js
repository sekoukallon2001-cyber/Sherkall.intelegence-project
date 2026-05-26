 // Sherkall Backend API
const BACKEND_URL = 'https://sherkall-backend-production.up.railway.app';
 // ── STATE ────────────────────────────────────────────────────────────────
    let currentLang = 'fr';
    let currentCurrency = 'GNF';

    const PRICES = {
        install:  { GNF:'400,000 GNF',   USD:'$46',    EUR:'€43'  },
        starter:  { GNF:'100,000 GNF',   USD:'$11',    EUR:'€10'  },
        fleet:    { GNF:'80,000 GNF',    USD:'$9',     EUR:'€8'   },
        relay:    { GNF:'+150,000 GNF',  USD:'+$17',   EUR:'+€16' },
    };

    document.getElementById('year').textContent = new Date().getFullYear();

    // ── MOBILE MENU ───────────────────────────────────────────────────────────
    function toggleMobileMenu() {
        const menu = document.getElementById('mobile-menu');
        const hamburger = document.getElementById('hamburger');
        const isOpen = menu.classList.toggle('active');
        if (hamburger) hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    // Allow keyboard activation of hamburger
    document.addEventListener('DOMContentLoaded', () => {
        const ham = document.getElementById('hamburger');
        if (ham) ham.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMobileMenu(); } });
        applyLanguage();
    });


    // ── DARK / LIGHT MODE ─────────────────────────────────────────────────────
    let isDark = true;
    function toggleTheme() {
        isDark = !isDark;
        document.body.classList.toggle('light-mode', !isDark);
        const btn = document.getElementById('theme-btn');
        if (btn) btn.textContent = isDark ? '🌙' : '☀️';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }
    // Restore saved theme preference
    (function() {
        const saved = localStorage.getItem('theme');
        if (saved === 'light') {
            isDark = false;
            document.body.classList.add('light-mode');
            const btn = document.getElementById('theme-btn');
            if (btn) btn.textContent = '☀️';
        }
    })();

    // ── LANGUAGE ──────────────────────────────────────────────────────────────
    function toggleLanguage() {
        currentLang = currentLang === 'en' ? 'fr' : 'en';
        const btn = document.getElementById('lang-btn');
        if (btn) {
            btn.textContent = currentLang === 'en' ? '🇫🇷 FR' : '🇬🇧 EN';
            btn.setAttribute('aria-label', currentLang === 'en' ? 'Switch to French' : 'Passer en anglais');
        }
        applyLanguage();
    }

    // ── WHATSAPP BILINGUAL MESSAGES ──────────────────────────────────────────
    const WA_MESSAGES = {
        protect: {
            en: "Hello Sherkall Intelligence! I want to protect my vehicle with GPS tracking. Can you give me more information and a price?",
            fr: "Bonjour Sherkall Intelligence ! Je veux protéger mon véhicule avec le suivi GPS. Pouvez-vous me donner plus d'informations et un tarif ?"
        },
        quote: {
            en: "Hello Sherkall Intelligence! I would like a quote for GPS installation on my vehicle. Can you tell me the price and your availability?",
            fr: "Bonjour Sherkall Intelligence ! Je voudrais un devis pour l'installation GPS sur mon véhicule. Pouvez-vous me dire le prix et vos disponibilités ?"
        },
        install: {
            en: "Hello Sherkall Intelligence! I am ready to book a GPS installation. When can your team come and where do you cover?",
            fr: "Bonjour Sherkall Intelligence ! Je suis prêt à réserver une installation GPS. Quand votre équipe peut-elle venir et quelle est votre zone de couverture ?"
        },
        devices: {
            en: "Hello Sherkall Intelligence! I want to know more about your GPS devices — the VT100-L tracker, fuel sensors, and relay options. Can you send me the details?",
            fr: "Bonjour Sherkall Intelligence ! Je veux en savoir plus sur vos appareils GPS — le traceur VT100-L, les capteurs de carburant et les options de relais. Pouvez-vous m'envoyer les détails ?"
        },
        fleet: {
            en: "Hello Sherkall Intelligence! I manage a fleet of 10 or more vehicles and I am interested in your fleet discount. Can you send me a custom quote?",
            fr: "Bonjour Sherkall Intelligence ! Je gère une flotte de 10 véhicules ou plus et je suis intéressé par votre remise flotte. Pouvez-vous m'envoyer un devis personnalisé ?"
        },
        fuel: {
            en: "Hello Sherkall Intelligence! I am interested in GPS installation with a fuel sensor — ultrasonic or capacitive. Can you tell me more about the options and pricing?",
            fr: "Bonjour Sherkall Intelligence ! Je suis intéressé par l'installation GPS avec un capteur de carburant — ultrasonique ou capacitif. Pouvez-vous m'en dire plus sur les options et les tarifs ?"
        },
        question: {
            en: "Hello Sherkall Intelligence! I have a question about your GPS tracking service. Can you help me?",
            fr: "Bonjour Sherkall Intelligence ! J'ai une question concernant votre service de suivi GPS. Pouvez-vous m'aider ?"
        },
        hello: {
            en: "Hello Sherkall Intelligence! I would like to learn more about your services.",
            fr: "Bonjour Sherkall Intelligence ! Je voudrais en savoir plus sur vos services."
        },
        relay: {
            en: "Hello Sherkall Intelligence! I am interested in adding the remote engine cut-off relay to my GPS installation. Can you tell me more?",
            fr: "Bonjour Sherkall Intelligence ! Je suis intéressé par l'ajout du relais de coupure moteur à distance à mon installation GPS. Pouvez-vous m'en dire plus ?"
        },
        personal: {
            en: "Hello Sherkall Intelligence! I want GPS tracking for my personal vehicle. What is the cost and how do I get started?",
            fr: "Bonjour Sherkall Intelligence ! Je veux le suivi GPS pour mon véhicule personnel. Quel est le coût et comment commencer ?"
        },
        business: {
            en: "Hello Sherkall Intelligence! I manage a business fleet and I am interested in GPS tracking for my vehicles. Can you contact me with more details?",
            fr: "Bonjour Sherkall Intelligence ! Je gère une flotte d'entreprise et je suis intéressé par le suivi GPS pour mes véhicules. Pouvez-vous me contacter avec plus de détails ?"
        }
    };

    function waOpen(key) {
        const msgs = WA_MESSAGES[key] || WA_MESSAGES.hello;
        const msg  = currentLang === 'fr' ? msgs.fr : msgs.en;
        window.open('https://wa.me/224629255946?text=' + encodeURIComponent(msg), '_blank');
    }

    function applyLanguage() {
        document.querySelectorAll('[data-en]').forEach(el => {
            const childrenHaveDataEn = Array.from(el.children).some(ch => ch.hasAttribute('data-en'));
            if (childrenHaveDataEn) return;
            const attr = currentLang === 'en' ? 'data-en' : 'data-fr';
                const val = el.getAttribute(attr);
                if (val !== null && val !== '') {
                    el.textContent = val;
                }
        });

        document.documentElement.lang = currentLang;

        const btn = document.getElementById('lang-btn');
        if (btn) {
            btn.textContent = currentLang === 'en' ? '🇫🇷 FR' : '🇬🇧 EN';
            btn.setAttribute('aria-label', currentLang === 'en' ? 'Switch to French' : 'Passer en anglais');
        }

        const ni = document.getElementById('name-input');
        const pi = document.getElementById('phone-input');
        if (ni) ni.placeholder = currentLang === 'en' ? 'Your Name' : 'Votre Nom';
        if (pi) pi.placeholder = '+224 629 255 946';

        const fn = document.getElementById('cf-firstname');
        const ln = document.getElementById('cf-lastname');
        const ph = document.getElementById('cf-phone');
        const em = document.getElementById('cf-email');
        if (fn) fn.placeholder = currentLang === 'en' ? 'First Name' : 'Prénom';
        if (ln) ln.placeholder = currentLang === 'en' ? 'Last Name' : 'Nom de famille';
        if (em) em.placeholder = currentLang === 'en' ? 'email@example.com' : 'email@exemple.com';

        const sel = document.getElementById('cf-interest');
        if (sel) updateDefaultMessage(sel.value);
    }

    function changeCurrency(cur) { currentCurrency = cur; updatePriceDisplay(); }
    function updatePriceDisplay() {
        const cur = currentCurrency;
        const map = {
            'price-install':  PRICES.install[cur],
            'price-starter':  PRICES.starter[cur],
            'price-fleet':    PRICES.fleet[cur],
            'price-relay':    PRICES.relay[cur],
        };
        Object.entries(map).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el && val) el.textContent = val;
        });
        // Update relay total line
        const relayTotals = { GNF:'one-time · total install = 550,000 GNF', USD:'one-time · total install = ~$63', EUR:'one-time · total install = ~€59' };
        const frRelayTotals = { GNF:'unique · installation totale = 550 000 GNF', USD:'unique · installation totale = ~$63', EUR:'unique · installation totale = ~€59' };
        document.querySelectorAll('[data-en*="total install"]').forEach(el => {
            el.textContent = currentLang === 'fr' ? frRelayTotals[cur] : relayTotals[cur];
        });
    }

    // ── MODAL ─────────────────────────────────────────────────────────────────
    function openModal() { document.getElementById('contact-modal').classList.add('active'); }
    function closeModal() { document.getElementById('contact-modal').classList.remove('active'); }
    function submitProtectForm(event) {
        event.preventDefault();
        const name  = document.getElementById('name-input').value.trim() || 'Client';
        const phone = document.getElementById('phone-input').value.trim();
        let msg;
        if (currentLang === 'fr') {
            msg = 'Bonjour Sherkall Intelligence ! Mon nom est ' + name + ', numéro : ' + phone + '. Je souhaite protéger mon véhicule. Pouvez-vous me contacter ?';
        } else {
            msg = 'Hello Sherkall Intelligence! My name is ' + name + ', number: ' + phone + '. I want to protect my vehicle. Please contact me.';
        }
        window.open('https://wa.me/224629255946?text=' + encodeURIComponent(msg), '_blank');
        closeModal();
    }

    // ── NAVBAR HIDE ON SCROLL ─────────────────────────────────────────────────
    let lastScrollY = 0;
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('nav');
        const cur = window.scrollY;
        nav.style.transform = (cur > lastScrollY && cur > 100) ? 'translateY(-100%)' : 'translateY(0)';
        lastScrollY = cur;
    });

    // ── SCROLL REVEAL ─────────────────────────────────────────────────────────
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // Also animate sections (non-reveal ones) on scroll
    const sectionObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.style.opacity = '1';
                e.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.07 });

    document.querySelectorAll('section, .stats-strip, .cta-band-section').forEach(sec => {
        if (sec.id === 'home') return;
        sec.style.opacity = '0';
        sec.style.transform = 'translateY(24px)';
        sec.style.transition = 'opacity 0.65s ease, transform 0.65s ease';
        sectionObserver.observe(sec);
    });

    // ── COUNT-UP ANIMATION ────────────────────────────────────────────────────
    const counterObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                const el = e.target;
                if (el.dataset.counted) return;
                el.dataset.counted = 'true';
                const target = parseInt(el.dataset.value);
                const suffix = el.dataset.suffix || '';
                if (!target) return;
                const duration = 2000;
                const start = performance.now();
                function tick(now) {
                    const elapsed = now - start;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    el.textContent = Math.round(eased * target) + suffix;
                    if (progress < 1) requestAnimationFrame(tick);
                }
                requestAnimationFrame(tick);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.stat-number[data-value]').forEach(el => counterObserver.observe(el));

    // ── REAL-TIME PHONE STATS ─────────────────────────────────────────────────
    const speedEl = document.querySelector('.phone-stat-val');
    const distEl = document.querySelectorAll('.phone-stat-val')[1];
    const durEl  = document.querySelectorAll('.phone-stat-val')[2];

    if (speedEl) {
        setInterval(() => {
            speedEl.textContent = Math.floor(Math.random() * 40 + 40);
        }, 3000);
    }

    let distVal = 12.5, durSec = 18 * 60;
    if (distEl && durEl) {
        setInterval(() => {
            distVal = Math.round((distVal + 0.1) * 10) / 10;
            distEl.textContent = distVal.toFixed(1);
            durSec += 2;
            const mm = String(Math.floor(durSec / 60)).padStart(2, '0');
            const ss = String(durSec % 60).padStart(2, '0');
            durEl.textContent = mm + ':' + ss;
        }, 2000);
    }

    // Also update float card speed/distance
    const floatSpeed = document.getElementById('gps-speed');
    if (floatSpeed) {
        setInterval(() => {
            floatSpeed.textContent = Math.floor(Math.random() * 40 + 40) + ' km/h';
        }, 3000);
    }

    // ── FAQ ACCORDION ─────────────────────────────────────────────────────────
    document.querySelectorAll('.faq-card').forEach(card => {
        card.addEventListener('click', () => {
            const isOpen = card.classList.contains('open');
            document.querySelectorAll('.faq-card').forEach(c => c.classList.remove('open'));
            if (!isOpen) card.classList.add('open');
        });
    });
    const firstFaq = document.querySelector('.faq-card');
    if (firstFaq) firstFaq.classList.add('open');

    // ── GPS COORDINATE SIMULATION ─────────────────────────────────────────────
    const coordEl = document.getElementById('gps-coords');
    if (coordEl) {
        let lat = 9.5370, lng = 13.6600;
        setInterval(() => {
            lat += (Math.random() * 0.0006 - 0.0003);
            lng += (Math.random() * 0.0006 - 0.0003);
            coordEl.textContent = lat.toFixed(4) + '° N, ' + lng.toFixed(4) + '° W';
        }, 2000);
    }

    // ── TOAST TRIGGERS ────────────────────────────────────────────────────────
    const toastMap = { 'features': 'toast-tracking', 'pricing': 'toast-pricing' };
    const toastObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                const toastId = toastMap[e.target.id];
                if (!toastId) return;
                const toast = document.getElementById(toastId);
                if (toast) {
                    setTimeout(() => {
                        toast.classList.add('show');
                        setTimeout(() => toast.classList.remove('show'), 5000);
                    }, 700);
                }
            }
        });
    }, { threshold: 0.3 });
    Object.keys(toastMap).forEach(id => {
        const el = document.getElementById(id);
        if (el) toastObserver.observe(el);
    });

    // ── CONTACT FORM ─────────────────────────────────────────────────────────
    // ✅ SECURITY NOTE: The anon key below is safe to use in frontend code —
    //    Supabase's security model is designed for this. Protect your data by:
    //    1. Keeping Row Level Security (RLS) ENABLED on the 'leads' table
    //    2. Setting an insert-only RLS policy (no public reads)
    //    3. Restricting allowed origins in your Supabase dashboard
    //    Never expose your service_role key — that one must stay server-side only.
    const SUPABASE_URL = 'https://diubotswoxoxbhtlznnm.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpdWJvdHN3b3hveGJodGx6bm5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNjY0NzgsImV4cCI6MjA5Mzk0MjQ3OH0.NVkoIcO1cy-TqoIIi3gK3nGOIrPJMilRVqThyeCKu9U';

    async function saveLeadToSupabase(lead) {
        if (!SUPABASE_URL || !SUPABASE_KEY) return false;
        try {
            const res = await fetch(SUPABASE_URL + '/rest/v1/leads', {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(lead)
            });
            if (!res.ok) {
                const err = await res.text();
                console.error('Supabase error', res.status, err);
                return false;
            }
            return true;
        } catch(e) {
            console.error('Supabase fetch failed:', e);
            return false;
        }
    }

    // ── INTEREST → DEFAULT MESSAGE (bilingual) ────────────────────────────
    const DEFAULT_MESSAGES = {
        en: {
            tracking:    "Hi, I want to install GPS tracking on my personal vehicle. Can you guide me?",
            fleet:       "Hi, I manage a fleet of vehicles and I'm interested in your Fleet Management solution. Can you tell me more about pricing and features for 2–20 vehicles?",
            fuel:        "Hi, I'm interested in GPS installation with a fuel sensor (ultrasonic or capacitive). Can you send me details and pricing?",
            enterprise:  "Hi, I manage 10+ vehicles and I'm interested in a fleet discount. Can you send me a custom quote?",
            quote:       "Hi, I'd like to get a custom price quote for fleet GPS monitoring. Can you send me the details?",
            install:     "Hi, I'm ready to schedule a GPS installation. When are you available and what are your coverage areas?",
            other:       "Hi, I have a question about your fleet monitoring services. Can you help me?"
        },
        fr: {
            tracking:    "Bonjour, je souhaite installer un suivi GPS sur mon véhicule personnel. Pouvez-vous me guider ?",
            fleet:       "Bonjour, je gère une flotte de véhicules et je suis intéressé par votre solution de gestion de flotte. Pouvez-vous me parler des tarifs pour 2 à 20 véhicules ?",
            fuel:        "Bonjour, je suis intéressé par le plan Contrôle Carburant Pro. J'opère des citernes et j'ai besoin d'analytique de consommation et de détection de vol. Pouvez-vous m'envoyer les détails ?",
            enterprise:  "Bonjour, je suis intéressé par le Commandement Entreprise pour 20+ véhicules. Pouvez-vous m'envoyer un devis personnalisé et planifier une consultation ?",
            quote:       "Bonjour, j'aimerais obtenir un devis personnalisé pour la surveillance GPS de flotte. Pouvez-vous m'envoyer les détails ?",
            install:     "Bonjour, je suis prêt à planifier une installation GPS. Quelles sont vos disponibilités et zones de couverture ?",
            other:       "Bonjour, j'ai une question concernant vos services de surveillance de flotte. Pouvez-vous m'aider ?"
        }
    };

    function updateDefaultMessage(value) {
        const textarea = document.getElementById('cf-message');
        if (!textarea) return;
        const msgs = DEFAULT_MESSAGES[currentLang] || DEFAULT_MESSAGES.fr;
        const allDefaults = [...Object.values(DEFAULT_MESSAGES.en), ...Object.values(DEFAULT_MESSAGES.fr)];
        const currentMsg = textarea.value.trim();
        const isDefault = allDefaults.some(m => m === currentMsg) || currentMsg === '';
        if (isDefault) textarea.value = msgs[value] || msgs.other;
    }

    async function submitContactForm() {
        const first = document.getElementById('cf-firstname').value.trim();
        const last = document.getElementById('cf-lastname').value.trim();
        const phone = document.getElementById('cf-phone').value.trim();
        const email = document.getElementById('cf-email').value.trim();
        const interest = document.getElementById('cf-interest');
        const interestText = interest.options[interest.selectedIndex].text;
        const message = document.getElementById('cf-message').value.trim();

        // Validation
        let errors = [];
        if (!first) errors.push('cf-firstname');
        if (!phone || !/^[\+\d\s\-]{7,20}$/.test(phone)) errors.push('cf-phone');
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('cf-email');

        if (errors.length > 0) {
            errors.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.style.borderColor = 'var(--red)';
                    el.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.15)';
                    el.addEventListener('input', () => {
                        el.style.borderColor = '';
                        el.style.boxShadow = '';
                    }, { once: true });
                }
            });
            document.getElementById(errors[0]).focus();
            return;
        }

        // Disable submit button while saving
        const submitBtn = document.querySelector('.form-submit-btn');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '⏳ Saving...'; }

        // 1. Save to Supabase (admin dashboard)
        const saved = await saveLeadToSupabase({
            name: first + ' ' + last,
            phone, email, interest: interestText, message, status: 'new', source: 'Website Landing Page'
        });

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '💬 <span data-en="Send on WhatsApp" data-fr="Envoyer sur WhatsApp">Send on WhatsApp</span>';
        }

        if (!saved) {
            console.warn('Supabase save failed. Check RLS policies and that the leads table columns match: name, phone, email, interest, message, status, source.');
        }

        // 2. Open WhatsApp — always runs as backup delivery (bilingual)
        let msg;
        if (currentLang === 'fr') {
            msg = 'Bonjour Sherkall Intelligence ! Mon nom est ' + first + ' ' + last + '.';
            msg += '\nTel: ' + phone;
            if (email) msg += '\nEmail: ' + email;
            msg += '\nInteret: ' + interestText;
            if (message) msg += '\nMessage: ' + message;
        } else {
            msg = 'Hello Sherkall Intelligence! My name is ' + first + ' ' + last + '.';
            msg += '\nPhone: ' + phone;
            if (email) msg += '\nEmail: ' + email;
            msg += '\nInterest: ' + interestText;
            if (message) msg += '\nMessage: ' + message;
        }
        window.open('https://wa.me/224629255946?text=' + encodeURIComponent(msg), '_blank');

        const cfSuccess = document.getElementById('cf-success');
        if (cfSuccess) {
            cfSuccess.classList.add('show');
            cfSuccess.setAttribute('aria-hidden', 'false');
            setTimeout(() => {
                cfSuccess.classList.remove('show');
                cfSuccess.setAttribute('aria-hidden', 'true');
            }, 6000);
        }
    }


    // ── INIT ──────────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        updatePriceDisplay();
        applyLanguage();
        initSpeedometer();
        initCompass();
        initLiveSignal();
        initGeofenceBuilder();
        initGlobe();
    });

    // ══════════════════════════════════════════════════════════════════
    // SPEEDOMETER
    // ══════════════════════════════════════════════════════════════════
    let targetSpeed = 60, currentSpeed = 0, speedRAF;

    function initSpeedometer() {
        drawSpeedo(0);
        animateSpeedo();
        // auto-vary speed
        setInterval(() => {
            if (targetSpeed > 0) targetSpeed = targetSpeed + (Math.random() * 10 - 5);
            targetSpeed = Math.max(0, Math.min(130, targetSpeed));
        }, 2000);
    }

    function setDemoSpeed(evt, v) {
        targetSpeed = v + (Math.random() * 10 - 5);
        targetSpeed = Math.max(0, Math.min(130, targetSpeed));
        document.querySelectorAll('#live-demo .dash-btn').forEach(b => b.classList.remove('active'));
        if (evt && evt.target) evt.target.classList.add('active');
        const statusEl = document.getElementById('vehicle-status');
        if (statusEl) {
            statusEl.textContent = v === 0 ? 'STOPPED' : 'MOVING';
            statusEl.className = 'signal-badge' + (v === 0 ? ' alert' : '');
        }
        const engineDot = document.getElementById('engine-dot');
        const engineVal = document.getElementById('engine-val');
        if (engineDot && engineVal) {
            engineDot.className = 'engine-dot' + (v === 0 ? '' : ' active');
            engineVal.textContent = v === 0 ? 'OFF' : 'ON';
        }
    }

    function animateSpeedo() {
        currentSpeed += (targetSpeed - currentSpeed) * 0.05;
        drawSpeedo(currentSpeed);
        const valEl = document.getElementById('speedo-val');
        if (valEl) valEl.textContent = Math.round(currentSpeed);
        speedRAF = requestAnimationFrame(animateSpeedo);
    }

    function drawSpeedo(speed) {
        const canvas = document.getElementById('speedoCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        const cx = W / 2, cy = H - 20;
        const R = Math.min(W, H * 1.8) * 0.42;
        ctx.clearRect(0, 0, W, H);

        const startA = Math.PI, endA = 0;
        const maxSpeed = 140;

        // Outer glow ring
        const grd = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R + 8);
        grd.addColorStop(0, 'rgba(10,132,255,0)');
        grd.addColorStop(1, 'rgba(10,132,255,0.15)');
        ctx.beginPath(); ctx.arc(cx, cy, R + 6, Math.PI, 0);
        ctx.strokeStyle = grd; ctx.lineWidth = 12; ctx.stroke();

        // Track
        ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, 0);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.stroke();

        // Colour zones
        const zones = [
            { from: 0, to: 60, color: 'rgba(34,197,94,0.7)' },
            { from: 60, to: 100, color: 'rgba(10,132,255,0.7)' },
            { from: 100, to: 140, color: 'rgba(239,68,68,0.7)' }
        ];
        zones.forEach(z => {
            const a1 = Math.PI + (z.from / maxSpeed) * Math.PI;
            const a2 = Math.PI + (z.to / maxSpeed) * Math.PI;
            ctx.beginPath(); ctx.arc(cx, cy, R, a1, a2);
            ctx.strokeStyle = z.color; ctx.lineWidth = 3; ctx.stroke();
        });

        // Active arc
        const activeAngle = Math.PI + (Math.min(speed, maxSpeed) / maxSpeed) * Math.PI;
        const arcGrd = ctx.createLinearGradient(cx - R, cy, cx + R, cy);
        arcGrd.addColorStop(0, '#22C55E'); arcGrd.addColorStop(0.5, '#0A84FF'); arcGrd.addColorStop(1, '#EF4444');
        ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, activeAngle);
        ctx.strokeStyle = arcGrd; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.stroke();

        // Tip glow
        if (speed > 2) {
            const tipX = cx + R * Math.cos(activeAngle);
            const tipY = cy + R * Math.sin(activeAngle);
            const glowGrd = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 14);
            glowGrd.addColorStop(0, 'rgba(10,132,255,0.9)'); glowGrd.addColorStop(1, 'transparent');
            ctx.beginPath(); ctx.arc(tipX, tipY, 14, 0, Math.PI * 2);
            ctx.fillStyle = glowGrd; ctx.fill();
        }

        // Tick marks
        for (let i = 0; i <= 14; i++) {
            const ang = Math.PI + (i / 14) * Math.PI;
            const isMajor = i % 2 === 0;
            const r1 = R - (isMajor ? 18 : 10);
            ctx.beginPath();
            ctx.moveTo(cx + R * Math.cos(ang), cy + R * Math.sin(ang));
            ctx.lineTo(cx + r1 * Math.cos(ang), cy + r1 * Math.sin(ang));
            ctx.strokeStyle = isMajor ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)';
            ctx.lineWidth = isMajor ? 2 : 1; ctx.stroke();
            if (isMajor) {
                const lx = cx + (R - 30) * Math.cos(ang), ly = cy + (R - 30) * Math.sin(ang);
                ctx.fillStyle = 'rgba(242,244,247,0.55)'; ctx.font = '10px Montserrat,sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(i * 10, lx, ly);
            }
        }
        // Needle
        const needleAngle = Math.PI + (Math.min(speed, maxSpeed) / maxSpeed) * Math.PI;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(needleAngle);
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(R - 22, 0);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();
        ctx.restore();
        ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#0A84FF'; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
    }

    // ══════════════════════════════════════════════════════════════════
    // COMPASS
    // ══════════════════════════════════════════════════════════════════
    let targetHeading = 0, currentHeading = 0;

    function initCompass() { drawCompass(0); animateCompass(); }

    function setDemoHeading(deg) { targetHeading = deg; }

    function animateCompass() {
        let delta = targetHeading - currentHeading;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        currentHeading += delta * 0.05;
        currentHeading = ((currentHeading % 360) + 360) % 360;
        drawCompass(currentHeading);
        const dirs = ['N','NE','E','SE','S','SW','W','NW'];
        const di = Math.round(currentHeading / 45) % 8;
        const dirEl = document.getElementById('compass-dir');
        const degEl = document.getElementById('compass-deg');
        if (dirEl) dirEl.textContent = dirs[di];
        if (degEl) degEl.textContent = Math.round(currentHeading) + '°';
        requestAnimationFrame(animateCompass);
        // auto-drift heading
    }

    function drawCompass(heading) {
        const canvas = document.getElementById('compassCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 10;
        ctx.clearRect(0, 0, W, H);

        // Outer ring gradient
        const outerGrd = ctx.createRadialGradient(cx, cy, R - 2, cx, cy, R + 2);
        outerGrd.addColorStop(0, 'rgba(10,132,255,0.6)');
        outerGrd.addColorStop(1, 'rgba(10,132,255,0)');
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.strokeStyle = outerGrd; ctx.lineWidth = 4; ctx.stroke();

        // Inner background
        ctx.beginPath(); ctx.arc(cx, cy, R - 3, 0, Math.PI * 2);
        const bgGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        bgGrd.addColorStop(0, 'rgba(10,32,51,0.95)');
        bgGrd.addColorStop(1, 'rgba(6,15,26,0.95)');
        ctx.fillStyle = bgGrd; ctx.fill();

        // Tick marks (rotate with heading)
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(-heading * Math.PI / 180);
        const cardinals = ['N','E','S','W'];
        for (let i = 0; i < 36; i++) {
            const angle = (i / 36) * Math.PI * 2;
            const isMajor = i % 9 === 0, isMinor = i % 3 === 0;
            const r1 = R - 3, r2 = r1 - (isMajor ? 16 : isMinor ? 10 : 6);
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
            ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
            const isN = i === 0;
            ctx.strokeStyle = isN ? '#EF4444' : isMajor ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)';
            ctx.lineWidth = isMajor ? 2 : 1; ctx.stroke();
            if (isMajor) {
                const lx = Math.cos(angle) * (r1 - 24), ly = Math.sin(angle) * (r1 - 24);
                ctx.fillStyle = isN ? '#EF4444' : 'rgba(242,244,247,0.8)';
                ctx.font = `bold 13px Montserrat,sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(cardinals[i / 9], lx, ly);
            }
        }
        ctx.restore();

        // Fixed north arrow (points up always)
        ctx.save(); ctx.translate(cx, cy);
        // N triangle (red)
        ctx.beginPath(); ctx.moveTo(0, -(R - 30)); ctx.lineTo(8, 0); ctx.lineTo(-8, 0); ctx.closePath();
        ctx.fillStyle = '#EF4444'; ctx.fill();
        // S triangle (white)
        ctx.beginPath(); ctx.moveTo(0, R - 30); ctx.lineTo(8, 0); ctx.lineTo(-8, 0); ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
        // Centre hub
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#0A84FF'; ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.restore();
    }

    // auto-drift heading
    setInterval(() => { targetHeading = (targetHeading + (Math.random() * 6 - 3) + 360) % 360; }, 3000);

    // ══════════════════════════════════════════════════════════════════
    // LIVE SIGNAL PANEL UPDATES
    // ══════════════════════════════════════════════════════════════════
    function initLiveSignal() {
        let lat = 9.6418, lng = 13.5789;
        setInterval(() => {
            // satellite count fluctuates
            const sats = Math.floor(Math.random() * 4) + 7;
            const sigEl = document.getElementById('sat-count');
            if (sigEl) sigEl.textContent = sats;
            const acc = (Math.random() * 3 + 1.5).toFixed(1);
            const accEl = document.getElementById('gps-acc');
            if (accEl) accEl.textContent = '±' + acc + 'm';
            lat += (Math.random() * 0.0006 - 0.0003);
            lng += (Math.random() * 0.0006 - 0.0003);
            const coordEl = document.getElementById('dash-coords');
            if (coordEl) coordEl.textContent = lat.toFixed(4) + '°N ' + lng.toFixed(4) + '°W';
            // globe counter
            const visEl = document.getElementById('globe-sat-visible');
            if (visEl) visEl.textContent = sats;
            const gaccEl = document.getElementById('globe-accuracy');
            if (gaccEl) gaccEl.textContent = '±' + acc + 'm';
        }, 2000);
    }

    // ══════════════════════════════════════════════════════════════════
    // GEOFENCE BUILDER
    // ══════════════════════════════════════════════════════════════════
    let geoTool = 'draw', geoPoints = [], geoCircleCenter = null, geoCircleRadius = 0;
    let geoVehicle = { x: 0.5, y: 0.5 }, geoVehicleAngle = 0;
    let geoIsDrawing = false, geoCircleStart = null;
    let geoRAF, geoVehicleTarget = { x: 0.5, y: 0.5 };
    let geoAlertShown = false;

    function initGeofenceBuilder() {
        const canvas = document.getElementById('geoCanvas');
        if (!canvas) return;
        const wrap = canvas.parentElement;
        function resize() {
            canvas.width = wrap.clientWidth;
            canvas.height = Math.min(480, Math.max(320, wrap.clientWidth * 0.52));
        }
        resize();
        window.addEventListener('resize', () => { resize(); drawGeo(); });

        canvas.addEventListener('mousedown', geoMouseDown);
        canvas.addEventListener('mousemove', geoMouseMove);
        canvas.addEventListener('mouseup', geoMouseUp);
        canvas.addEventListener('touchstart', e => { e.preventDefault(); geoMouseDown(e.touches[0]); }, {passive:false});
        canvas.addEventListener('touchmove', e => { e.preventDefault(); geoMouseMove(e.touches[0]); }, {passive:false});
        canvas.addEventListener('touchend', e => { e.preventDefault(); geoMouseUp(e.changedTouches[0]); }, {passive:false});

        // Start auto-moving vehicle
        function moveVehicle() {
            geoVehicleTarget.x = 0.2 + Math.random() * 0.6;
            geoVehicleTarget.y = 0.2 + Math.random() * 0.6;
        }
        moveVehicle();
        setInterval(moveVehicle, 4000);
        geoLoop();
    }

    function getGeoXY(e) {
        const canvas = document.getElementById('geoCanvas');
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function geoMouseDown(e) {
        const p = getGeoXY(e);
        if (geoTool === 'draw') { geoIsDrawing = true; geoPoints = [p]; }
        else if (geoTool === 'circle') { geoCircleStart = p; geoCircleCenter = p; geoCircleRadius = 0; geoIsDrawing = true; }
    }

    function geoMouseMove(e) {
        if (!geoIsDrawing) return;
        const p = getGeoXY(e);
        if (geoTool === 'draw') { geoPoints.push(p); drawGeo(); }
        else if (geoTool === 'circle') {
            geoCircleCenter = { x: (geoCircleStart.x + p.x) / 2, y: (geoCircleStart.y + p.y) / 2 };
            const dx = p.x - geoCircleStart.x, dy = p.y - geoCircleStart.y;
            geoCircleRadius = Math.sqrt(dx*dx + dy*dy) / 2;
            drawGeo();
        }
        updateGeoStatus(p);
    }

    function geoMouseUp(e) {
        geoIsDrawing = false;
        if (geoTool === 'draw' && geoPoints.length > 2) {
            updateGeoStatus(null, 'Zone drawn! Vehicle will alert on exit.');
        }
        drawGeo();
    }

    function updateGeoStatus(p, msg) {
        const el = document.getElementById('geo-status');
        if (!el) return;
        if (msg) { el.textContent = msg; return; }
        if (geoTool === 'draw') {
            el.textContent = geoPoints.length > 0
                ? `${geoPoints.length} points — release to close zone`
                : 'Click and drag to draw zone boundary';
        } else {
            el.textContent = geoCircleRadius > 10
                ? `Circle zone: r=${Math.round(geoCircleRadius)}px`
                : 'Click and drag to set circle radius';
        }
    }

    function setGeoTool(t) {
        geoTool = t; geoPoints = []; geoCircleCenter = null; geoCircleRadius = 0; geoIsDrawing = false;
        document.querySelectorAll('.geo-tool-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(t === 'draw' ? 'geo-draw-btn' : 'geo-circle-btn').classList.add('active');
        updateGeoStatus(null, t === 'draw' ? 'Click and drag to draw zone boundary' : 'Click and drag to set circle radius');
        drawGeo();
    }

    function clearGeoFence() {
        geoPoints = []; geoCircleCenter = null; geoCircleRadius = 0;
        document.getElementById('geo-alert-banner').classList.remove('show');
        geoAlertShown = false;
        updateGeoStatus(null, 'Click the map to start drawing');
        drawGeo();
    }

    function pointInPolygon(px, py, pts) {
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            if (((pts[i].y > py) !== (pts[j].y > py)) &&
                (px < (pts[j].x - pts[i].x) * (py - pts[i].y) / (pts[j].y - pts[i].y) + pts[i].x)) {
                inside = !inside;
            }
        }
        return inside;
    }

    function isVehicleInZone(vx, vy) {
        if (geoTool === 'circle' && geoCircleCenter && geoCircleRadius > 20) {
            const dx = vx - geoCircleCenter.x, dy = vy - geoCircleCenter.y;
            return Math.sqrt(dx*dx + dy*dy) < geoCircleRadius;
        }
        if (geoTool === 'draw' && geoPoints.length > 3) {
            return pointInPolygon(vx, vy, geoPoints);
        }
        return true; // no zone = always "in"
    }

    function geoLoop() {
        const canvas = document.getElementById('geoCanvas');
        if (!canvas) return;
        // Move vehicle
        geoVehicle.x += (geoVehicleTarget.x * canvas.width - geoVehicle.x * canvas.width) * 0.008 / canvas.width;
        geoVehicle.y += (geoVehicleTarget.y * canvas.height - geoVehicle.y * canvas.height) * 0.008 / canvas.height;
        // in canvas px
        const vx = geoVehicle.x * canvas.width;
        const vy = geoVehicle.y * canvas.height;
        const hasZone = (geoTool === 'draw' && geoPoints.length > 3) || (geoTool === 'circle' && geoCircleRadius > 20);
        if (hasZone) {
            const inZone = isVehicleInZone(vx, vy);
            const bannerEl = document.getElementById('geo-alert-banner');
            if (!inZone && !geoAlertShown) {
                geoAlertShown = true;
                if (bannerEl) bannerEl.classList.add('show');
                setTimeout(() => { if (bannerEl) bannerEl.classList.remove('show'); geoAlertShown = false; }, 4000);
            }
        }
        drawGeo();
        requestAnimationFrame(geoLoop);
    }

    function drawGeo() {
        const canvas = document.getElementById('geoCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        // Map bg
        ctx.fillStyle = '#050e1a'; ctx.fillRect(0, 0, W, H);
        // Grid
        ctx.strokeStyle = 'rgba(10,132,255,0.07)'; ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
        for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

        // Roads
        ctx.strokeStyle = 'rgba(20,55,90,0.7)'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(0, H*0.35); ctx.lineTo(W, H*0.35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, H*0.65); ctx.lineTo(W, H*0.65); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W*0.3, 0); ctx.lineTo(W*0.3, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W*0.65, 0); ctx.lineTo(W*0.65, H); ctx.stroke();

        // Zone
        const hasPolygon = geoTool === 'draw' && geoPoints.length > 2;
        const hasCircle = geoTool === 'circle' && geoCircleCenter && geoCircleRadius > 10;
        const vx = geoVehicle.x * W, vy = geoVehicle.y * H;
        const inZone = isVehicleInZone(vx, vy);
        const zoneColor = !( hasPolygon || hasCircle) ? '#0A84FF' : inZone ? '#22C55E' : '#EF4444';

        if (hasPolygon) {
            ctx.beginPath(); ctx.moveTo(geoPoints[0].x, geoPoints[0].y);
            geoPoints.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.closePath();
            ctx.fillStyle = inZone ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.12)';
            ctx.fill();
            ctx.strokeStyle = inZone ? '#22C55E' : '#EF4444';
            ctx.lineWidth = 2.5; ctx.setLineDash([8,5]); ctx.stroke(); ctx.setLineDash([]);
            // Corner dots
            geoPoints.filter((_,i)=>i%8===0).forEach(p => {
                ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
                ctx.fillStyle = inZone ? '#22C55E' : '#EF4444'; ctx.fill();
            });
        }

        if (hasCircle) {
            ctx.beginPath(); ctx.arc(geoCircleCenter.x, geoCircleCenter.y, geoCircleRadius, 0, Math.PI*2);
            ctx.fillStyle = inZone ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.12)'; ctx.fill();
            ctx.strokeStyle = inZone ? '#22C55E' : '#EF4444';
            ctx.lineWidth = 2.5; ctx.setLineDash([8,5]); ctx.stroke(); ctx.setLineDash([]);
            // Radius line
            ctx.beginPath(); ctx.moveTo(geoCircleCenter.x, geoCircleCenter.y);
            ctx.lineTo(geoCircleCenter.x + geoCircleRadius, geoCircleCenter.y);
            ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.stroke();
            // Center dot
            ctx.beginPath(); ctx.arc(geoCircleCenter.x, geoCircleCenter.y, 5, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();
        }

        // Vehicle trail
        ctx.beginPath(); ctx.arc(vx, vy, 22, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(10,132,255,0.08)'; ctx.fill();
        ctx.beginPath(); ctx.arc(vx, vy, 14, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(10,132,255,0.15)'; ctx.fill();
        // Vehicle dot
        ctx.beginPath(); ctx.arc(vx, vy, 8, 0, Math.PI*2);
        ctx.fillStyle = zoneColor; ctx.fill();
        ctx.beginPath(); ctx.arc(vx, vy, 8, 0, Math.PI*2);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
        // Vehicle pulse ring
        ctx.beginPath(); ctx.arc(vx, vy, 16, 0, Math.PI*2);
        ctx.strokeStyle = zoneColor; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 1;
    }

    // ══════════════════════════════════════════════════════════════════
    // 3D GLOBE (Three.js via CDN)
    // ══════════════════════════════════════════════════════════════════
    function initGlobe() {
        const canvas = document.getElementById('globeCanvas');
        if (!canvas) return;
        const wrap = canvas.parentElement;
        const W = Math.min(wrap.clientWidth, 800);
        const H = Math.min(W, 520);
        canvas.width = W; canvas.height = H;

        // Use our own WebGL-style canvas renderer (no external lib needed)
        const ctx = canvas.getContext('2d');
        let rotX = 0.3, rotY = 0, isDragging = false, lastMX = 0, lastMY = 0;
        let zoom = 1, targetZoom = 1;

        // Guinea coordinates (lat/lng in radians)
        const guineaLat = 11 * Math.PI / 180;
        const guineaLng = -12 * Math.PI / 180;

        // Satellites in GPS constellation (simplified MEO orbits)
        const satellites = [];
        for (let i = 0; i < 24; i++) {
            const plane = Math.floor(i / 4);
            const slot = i % 4;
            satellites.push({
                inclination: (55 + plane * 5) * Math.PI / 180,
                raan: (plane * 60) * Math.PI / 180,   // right ascension of ascending node
                meanAnomaly: (slot * 90 + plane * 30) * Math.PI / 180,
                speed: 0.0004 + Math.random() * 0.0002,
                size: 2.5 + Math.random(),
                id: i
            });
        }

        // Lat/lng grid lines storage
        function project3D(lat, lng) {
            // Rotate lat/lng to 3D xyz on unit sphere
            const x = Math.cos(lat) * Math.cos(lng);
            const y = Math.sin(lat);
            const z = Math.cos(lat) * Math.sin(lng);
            // Apply rotY (yaw) then rotX (pitch)
            const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
            const x2 = x * cosY - z * sinY;
            const z2 = x * sinY + z * cosY;
            const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
            const y3 = y * cosX - z2 * sinX;
            const z3 = y * sinX + z2 * cosX;
            return { x: x2, y: y3, z: z3 };
        }

        function toCanvas(p) {
            const R = Math.min(W, H) * 0.4 * zoom;
            return { x: W / 2 + p.x * R, y: H / 2 - p.y * R, z: p.z, R };
        }

        function satPosition(sat, t) {
            // Simplified orbital mechanics
            const anomaly = sat.meanAnomaly + t * sat.speed;
            // Position in orbital plane
            const ox = Math.cos(anomaly);
            const oz = Math.sin(anomaly);
            // Rotate by inclination
            const iy = oz * Math.sin(sat.inclination);
            const iz = oz * Math.cos(sat.inclination);
            // Rotate by RAAN
            const cosR = Math.cos(sat.raan), sinR = Math.sin(sat.raan);
            const wx = ox * cosR - iz * sinR;
            const wz = ox * sinR + iz * cosR;
            // Altitude factor (GPS ~20,200km, Earth radius ~6,371km → ratio ~4.17)
            const alt = 1.55;
            return { lat: Math.asin(iy), lng: Math.atan2(wz, wx), alt };
        }

        function isVisible(p) { return p.z > -0.2; }

        let t = 0;
        function drawGlobe() {
            t += 1;
            ctx.clearRect(0, 0, W, H);

            const R = Math.min(W, H) * 0.4 * zoom;
            const cx = W / 2, cy = H / 2;

            // Space background
            ctx.fillStyle = '#050e1a'; ctx.fillRect(0, 0, W, H);

            // Stars
            if (!drawGlobe._stars) {
                drawGlobe._stars = Array.from({length:200}, () => ({
                    x: Math.random() * W, y: Math.random() * H,
                    r: Math.random() * 1.5, a: Math.random()
                }));
            }
            drawGlobe._stars.forEach(s => {
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
                ctx.fillStyle = `rgba(255,255,255,${s.a * 0.6})`; ctx.fill();
            });

            // Atmosphere glow
            const atmosGrd = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.12);
            atmosGrd.addColorStop(0, 'rgba(10,132,255,0.25)');
            atmosGrd.addColorStop(0.5, 'rgba(10,132,255,0.08)');
            atmosGrd.addColorStop(1, 'rgba(10,132,255,0)');
            ctx.beginPath(); ctx.arc(cx, cy, R * 1.12, 0, Math.PI*2);
            ctx.fillStyle = atmosGrd; ctx.fill();

            // Globe base gradient
            const globeGrd = ctx.createRadialGradient(cx - R*0.3, cy - R*0.3, R*0.1, cx, cy, R);
            globeGrd.addColorStop(0, '#0d3060');
            globeGrd.addColorStop(0.5, '#06205c');
            globeGrd.addColorStop(1, '#030f2e');
            ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
            ctx.fillStyle = globeGrd; ctx.fill();

            // Latitude lines
            ctx.lineWidth = 0.5;
            for (let lat = -80; lat <= 80; lat += 20) {
                const latR = lat * Math.PI / 180;
                ctx.beginPath();
                let firstVisible = true;
                for (let lng = -180; lng <= 180; lng += 3) {
                    const lngR = lng * Math.PI / 180;
                    const p = project3D(latR, lngR);
                    const c = toCanvas(p);
                    if (p.z > 0) {
                        if (firstVisible) { ctx.moveTo(c.x, c.y); firstVisible = false; }
                        else ctx.lineTo(c.x, c.y);
                    } else { firstVisible = true; }
                }
                ctx.strokeStyle = 'rgba(10,132,255,0.18)'; ctx.stroke();
            }

            // Longitude lines
            for (let lng = -180; lng <= 180; lng += 20) {
                const lngR = lng * Math.PI / 180;
                ctx.beginPath(); let firstV = true;
                for (let lat = -90; lat <= 90; lat += 3) {
                    const latR = lat * Math.PI / 180;
                    const p = project3D(latR, lngR);
                    const c = toCanvas(p);
                    if (p.z > 0) {
                        if (firstV) { ctx.moveTo(c.x, c.y); firstV = false; }
                        else ctx.lineTo(c.x, c.y);
                    } else { firstV = true; }
                }
                ctx.strokeStyle = 'rgba(10,132,255,0.12)'; ctx.stroke();
            }

            // Terminator (shadow)
            ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2); ctx.clip();
            const shadowX = cx + R * 0.6, shadowY = cy - R * 0.2;
            const shadowGrd = ctx.createRadialGradient(shadowX, shadowY, 0, cx, cy, R * 1.4);
            shadowGrd.addColorStop(0, 'transparent');
            shadowGrd.addColorStop(0.65, 'transparent');
            shadowGrd.addColorStop(1, 'rgba(0,5,20,0.7)');
            ctx.fillStyle = shadowGrd; ctx.fillRect(0, 0, W, H);
            ctx.restore();

            // Guinea highlight
            const guineaP = project3D(guineaLat, guineaLng);
            if (isVisible(guineaP)) {
                const gC = toCanvas(guineaP);
                // Pulse ring
                const pulse = (Math.sin(t * 0.05) + 1) / 2;
                const pR = 10 + pulse * 15;
                ctx.beginPath(); ctx.arc(gC.x, gC.y, pR, 0, Math.PI*2);
                ctx.fillStyle = `rgba(10,132,255,${0.08 + pulse * 0.06})`; ctx.fill();
                ctx.beginPath(); ctx.arc(gC.x, gC.y, 7, 0, Math.PI*2);
                ctx.fillStyle = '#0A84FF'; ctx.fill();
                ctx.beginPath(); ctx.arc(gC.x, gC.y, 7, 0, Math.PI*2);
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
                ctx.beginPath(); ctx.arc(gC.x, gC.y, 3, 0, Math.PI*2);
                ctx.fillStyle = '#fff'; ctx.fill();
                // Label
                if (guineaP.z > 0.1) {
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Montserrat,sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('GUINEA', gC.x, gC.y - 14);
                }
            }

            // Satellites
            const visibleSats = [];
            satellites.forEach(sat => {
                const pos = satPosition(sat, t);
                const p3 = project3D(pos.lat, pos.lng);
                const altR = 1 + (pos.alt - 1) * 0.4; // scaled altitude on screen
                const altPx = R * altR;
                const px = cx + p3.x * altPx;
                const py = cy - p3.y * altPx;

                if (p3.z > 0) {
                    visibleSats.push({ px, py, sat, pos, p3 });

                    // Check if visible from Guinea (dot product > 0.6 = roughly same side)
                    const guineaVec = project3D(guineaLat, guineaLng);
                    const coverage = p3.x * guineaVec.x + p3.y * guineaVec.y + p3.z * guineaVec.z;
                    const isAboveGuinea = coverage > 0.6 && guineaP.z > 0;

                    // Signal line to Guinea
                    if (isAboveGuinea && guineaP.z > 0) {
                        const gC = toCanvas(guineaP);
                        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(gC.x, gC.y);
                        ctx.strokeStyle = 'rgba(10,132,255,0.2)'; ctx.lineWidth = 0.8; ctx.stroke();
                    }

                    // Orbit trail
                    ctx.beginPath();
                    for (let ta = -30; ta <= 0; ta++) {
                        const tp = satPosition(sat, t + ta);
                        const tp3 = project3D(tp.lat, tp.lng);
                        const talt = R * (1 + (tp.alt - 1) * 0.4);
                        const tx = cx + tp3.x * talt, ty = cy - tp3.y * talt;
                        if (tp3.z > 0) {
                            if (ta === -30) ctx.moveTo(tx, ty);
                            else ctx.lineTo(tx, ty);
                        }
                    }
                    ctx.strokeStyle = isAboveGuinea ? 'rgba(10,132,255,0.35)' : 'rgba(255,255,255,0.1)';
                    ctx.lineWidth = 0.8; ctx.stroke();

                    // Sat dot
                    ctx.beginPath(); ctx.arc(px, py, sat.size, 0, Math.PI*2);
                    ctx.fillStyle = isAboveGuinea ? '#0A84FF' : 'rgba(255,255,255,0.7)'; ctx.fill();
                    if (isAboveGuinea) {
                        ctx.beginPath(); ctx.arc(px, py, sat.size + 3, 0, Math.PI*2);
                        ctx.strokeStyle = 'rgba(10,132,255,0.4)'; ctx.lineWidth = 1; ctx.stroke();
                    }
                }
            });

            // Globe edge
            ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
            const edgeGrd = ctx.createRadialGradient(cx-R*0.2, cy-R*0.2, R*0.5, cx, cy, R);
            edgeGrd.addColorStop(0, 'transparent');
            edgeGrd.addColorStop(0.85, 'transparent');
            edgeGrd.addColorStop(1, 'rgba(10,132,255,0.25)');
            ctx.strokeStyle = 'rgba(10,132,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();

            if (globeVisible) requestAnimationFrame(drawGlobe);
        }

        // Pause animation when globe is off-screen
        let globeVisible = false;
        let globeRAF = null;
        const globeVisObserver = new IntersectionObserver(entries => {
            entries.forEach(e => {
                globeVisible = e.isIntersecting;
                if (globeVisible && !globeRAF) {
                    globeRAF = requestAnimationFrame(function loop() {
                        globeRAF = null;
                        drawGlobe();
                    });
                }
            });
        }, { threshold: 0.1 });
        globeVisObserver.observe(canvas);

        // Mouse/touch rotate
        canvas.addEventListener('mousedown', e => { isDragging = true; lastMX = e.clientX; lastMY = e.clientY; });
        canvas.addEventListener('mousemove', e => {
            if (!isDragging) return;
            rotY += (e.clientX - lastMX) * 0.005;
            rotX += (e.clientY - lastMY) * 0.005;
            rotX = Math.max(-1.2, Math.min(1.2, rotX));
            lastMX = e.clientX; lastMY = e.clientY;
        });
        canvas.addEventListener('mouseup', () => isDragging = false);
        canvas.addEventListener('mouseleave', () => isDragging = false);
        canvas.addEventListener('wheel', e => {
            targetZoom = Math.max(0.6, Math.min(2, targetZoom - e.deltaY * 0.001));
            zoom += (targetZoom - zoom) * 0.1;
        });
        canvas.addEventListener('touchstart', e => {
            if (e.touches.length === 1) { isDragging = true; lastMX = e.touches[0].clientX; lastMY = e.touches[0].clientY; }
        }, {passive:true});
        canvas.addEventListener('touchmove', e => {
            if (!isDragging || e.touches.length !== 1) return;
            rotY += (e.touches[0].clientX - lastMX) * 0.005;
            rotX += (e.touches[0].clientY - lastMY) * 0.005;
            rotX = Math.max(-1.2, Math.min(1.2, rotX));
            lastMX = e.touches[0].clientX; lastMY = e.touches[0].clientY;
        }, {passive:true});
        canvas.addEventListener('touchend', () => isDragging = false);

        // Auto-rotate when not dragging
        setInterval(() => { if (!isDragging) rotY += 0.003; zoom += (targetZoom - zoom) * 0.08; }, 16);

        // Initial draw will be triggered by IntersectionObserver above
    }

    // ── SCROLL PROGRESS BAR ───────────────────────────────────────────────────
    const scrollProgress = document.getElementById('scroll-progress');
    if (scrollProgress) {
        window.addEventListener('scroll', () => {
            const scrollTop = window.scrollY;
            const docHeight = document.body.scrollHeight - window.innerHeight;
            const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            scrollProgress.style.width = progress + '%';
        }, {passive: true});
    }


