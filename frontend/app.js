// Artisan AI Web App Logic

// Global connection state
let isLiveMode = false;
const BACKEND_URL = 'http://localhost:8000';

// Predefined product templates (with high-quality craft images from Unsplash)
const productTemplates = {
    dupatta: {
        category: 'Textiles',
        cost: 350,
        hours: 8,
        originalImg: 'https://images.unsplash.com/photo-1610116306796-6ebd30d779c6?auto=format&fit=crop&w=600&q=80', // Embroidery fabric
        enhancedImg: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80', // Centered silk craft drape
        voiceTranscript: 'यह एक हाथ से बुना हुआ बनारसी सूती दुपट्टा है जिसमें सुनहरी कढ़ाई है और किनारी का सुंदर काम है।',
        catalog: {
            detected_language: 'Hindi',
            raw_transcription: 'यह एक हाथ से बुना हुआ बनारसी सूती दुपट्टा है जिसमें सुनहरी कढ़ाई है और किनारी का सुंदर काम है।',
            title_en: 'Handloom Banarasi Cotton Dupatta with Golden Embroidery',
            description_en: 'Wrap yourself in elegance with this handcrafted Banarasi Cotton Dupatta. Painstakingly handwoven by traditional weavers, this piece features elaborate golden embroidery and delicate border work, making it perfect for festive occasions and heritage styling.',
            title_hi: 'सुनहरी कढ़ाई के साथ हथकरघा बनारसी सूती दुपट्टा',
            description_hi: 'इस हस्तनिर्मित बनारसी सूती दुपट्टे के साथ लालित्य में खुद को लपेटें। पारंपरिक बुनकरों द्वारा हाथ से बुने गए इस दुपट्टे में सुनहरी कढ़ाई और नाजुक बॉर्डर का काम है।',
            materials: ['Cotton Silk Thread', 'Zari Border', 'Natural Dyes'],
            tags: ['banarasi dupatta', 'handloom cotton', 'gold embroidery', 'artisan craft', 'traditional drape']
        },
        pricing: {
            retail: 1550,
            b2b: 1320,
            range: '₹ 1,450 - ₹ 1,950',
            strategy: 'Highlight the custom 8-hour hand-weaving process. Focus marketing efforts on the authentic embroidery technique and pure cotton materials to justify pricing.',
            ledgerMaterial: 350,
            ledgerLabor: 1200
        }
    },
    bottle: {
        category: 'Pottery',
        cost: 80,
        hours: 3,
        originalImg: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=600&q=80', // Rough terracotta items
        enhancedImg: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=600&q=80', // Clean isolated terracotta vessel
        voiceTranscript: 'मिट्टी की बोतल है कुम्हार के हाथ से बनी हुई। पानी को प्राकृतिक रूप से ठंडा रखती है। स्वास्थ्य के लिए बहुत अच्छी है।',
        catalog: {
            detected_language: 'Hindi',
            raw_transcription: 'मिट्टी की बोतल है कुम्हार के हाथ से बनी हुई। पानी को प्राकृतिक रूप से ठंडा रखती है। स्वास्थ्य के लिए बहुत अच्छी है।',
            title_en: 'Handcrafted Terracotta Clay Water Bottle',
            description_en: 'Stay healthy and hydrated with our 100% natural, organic clay terracotta water bottle. Handmade by traditional pottery artisans, this eco-friendly clay bottle naturally cools water through evaporation. Perfect for daily use and helps retain natural minerals.',
            title_hi: 'हस्तनिर्मित मिट्टी की बोतल (टेराकोटा)',
            description_hi: 'हमारे 100% प्राकृतिक और जैविक टेराकोटा मिट्टी की पानी की बोतल से स्वस्थ रहें। पारंपरिक कुम्हारों द्वारा हस्तनिर्मित, यह पर्यावरण-अनुकूल बोतल पानी को प्राकृतिक रूप से ठंडा रखती है। दैनिक उपयोग के लिए सर्वोत्तम।',
            materials: ['Terracotta Clay', 'Organic Mud', 'Natural Polish'],
            tags: ['terracotta bottle', 'clay bottle', 'handicraft', 'organic', 'eco-friendly water bottle', 'pottery']
        },
        pricing: {
            retail: 530,
            b2b: 450,
            range: '₹ 480 - ₹ 650',
            strategy: 'Emphasize the health benefits of alkaline clay water. Highlight that it naturally cools water without electricity, catering to eco-conscious consumers.',
            ledgerMaterial: 80,
            ledgerLabor: 450
        }
    },
    toy: {
        category: 'Handicrafts',
        cost: 120,
        hours: 5,
        originalImg: 'https://images.unsplash.com/photo-1537655780520-1e392edd816a?auto=format&fit=crop&w=600&q=80', // Toys background
        enhancedImg: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=600&q=80', // Polished wooden toys
        voiceTranscript: 'लकड़ी का बना हुआ हाथी खिलौना है, बच्चों के खेलने के लिए। इसमें प्राकृतिक सब्जियों के रंग इस्तेमाल किये गए हैं जो बिल्कुल सुरक्षित हैं।',
        catalog: {
            detected_language: 'Hindi',
            raw_transcription: 'लकड़ी का बना हुआ हाथी खिलौना है, बच्चों के खेलने के लिए। इसमें प्राकृतिक सब्जियों के रंग इस्तेमाल किये गए हैं जो बिल्कुल सुरक्षित हैं।',
            title_en: 'Hand-carved Colorful Wooden Elephant Toy',
            description_en: 'Bring joy to your kids with this hand-carved, traditional wooden elephant toy. Painted with organic non-toxic vegetable dyes, this bright toy represents the classic woodcraft heritage of Channapatna. Safe, durable, and completely natural.',
            title_hi: 'हस्त-नक्काशीदार रंगीन लकड़ी का हाथी खिलौना',
            description_hi: 'पारंपरिक हस्तनिर्मित लकड़ी के हाथी के खिलौने के साथ अपने बच्चों के चेहरे पर मुस्कान लाएं। जैविक गैर-विषाक्त सब्जियों के रंगों से रंगा हुआ यह खिलौना सुरक्षित और मजबूत है।',
            materials: ['Wrightia Tinctoria Wood', 'Organic Vegetable Dyes', 'Lacquer Polish'],
            tags: ['wooden toy', 'hand-carved toy', 'channapatna toys', 'organic paint', 'heritage craft', 'elephant toy']
        },
        pricing: {
            retail: 870,
            b2b: 740,
            range: '₹ 800 - ₹ 1,050',
            strategy: 'Market this as a non-toxic, child-safe alternative to plastic toys. Highlight the heritage Channapatna woodcraft connection and eco-friendly manufacturing process.',
            ledgerMaterial: 120,
            ledgerLabor: 750
        }
    },
    pot: {
        category: 'Pottery',
        cost: 180,
        hours: 6,
        originalImg: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=600&q=80', // Ceramic craft
        enhancedImg: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=600&q=80', // Clean blue glaze vase
        voiceTranscript: 'जयपुर की प्रसिद्ध नीली मिट्टी का फूलदान है। हाथ से की गयी सुंदर फूलों की पेंटिंग है, सजावट के लिए बहुत बढ़िया है।',
        catalog: {
            detected_language: 'Hindi',
            raw_transcription: 'जयपुर की प्रसिद्ध नीली मिट्टी का फूलदान है। हाथ से की गयी सुंदर फूलों की पेंटिंग है, सजावट के लिए बहुत बढ़िया है।',
            title_en: 'Jaipur Blue Pottery Hand-painted Floral Vase',
            description_en: 'Adorn your home with this exquisite Jaipur Blue Pottery flower vase. Hand-painted with intricate floral designs, this unique pottery technique uses a dough made of quartz, raw glaze, and cobalt oxide. It does not use clay and is highly durable and glossy.',
            title_hi: 'जयपुर ब्लू पॉटरी हस्त-चित्रित पुष्प फूलदान',
            description_hi: 'इस उत्कृष्ट जयपुर ब्लू पॉटरी फूलदान से अपने घर को सजाएं। जटिल पुष्प डिजाइनों के साथ हाथ से पेंट किया गया यह फूलदान बिना मिट्टी के बनाया जाता है और अत्यंत चमकदार है।',
            materials: ['Quartz Powder', 'Glass Powder', 'Cobalt Oxide Glaze'],
            tags: ['blue pottery', 'jaipur pottery', 'floral vase', 'hand-painted vase', 'ceramic art', 'luxury handicraft']
        },
        pricing: {
            retail: 1080,
            b2b: 920,
            range: '₹ 990 - ₹ 1,250',
            strategy: 'Highlight that it is authentic Jaipur Blue Pottery, which is completely clay-free and uses hand-mixed quartz dough. Target interior design buyers looking for authentic craft pieces.',
            ledgerMaterial: 180,
            ledgerLabor: 900
        }
    }
};

// Initial B2B Marketplace products data
const initialMarketplaceProducts = [
    {
        id: 1,
        title: 'Handwoven Pure Mulberry Silk Banarasi Saree',
        category: 'Textiles',
        artisan: 'Sunita Devi (Weaver Cooperative, Varanasi)',
        price: 8490,
        syncStatus: ['ONDC Live', 'GeM Live'],
        image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80',
        desc: 'Traditional pure silk Banarasi Saree handwoven with fine silver zari details.'
    },
    {
        id: 2,
        title: 'Organic Terracotta Cooling Clay Water Dispenser',
        category: 'Pottery',
        artisan: 'Ramesh Kumhar (Mitti Art, Jaipur)',
        price: 950,
        syncStatus: ['ONDC Live'],
        image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=400&q=80',
        desc: 'Eco-friendly water cooler handmade with traditional porous clay for healthy natural cooling.'
    },
    {
        id: 3,
        title: 'Hand-carved Lacquered Wooden Nesting Dolls',
        category: 'Handicrafts',
        artisan: 'K. Lingaiah (Toymaker Guild, Channapatna)',
        price: 680,
        syncStatus: ['Syncing'],
        image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=400&q=80',
        desc: 'Nontoxic lacquered wooden doll set painted with natural fruit and vegetable dye extracts.'
    },
    {
        id: 4,
        title: 'Jaipur Blue Pottery Ceramic Bowl Set',
        category: 'Pottery',
        artisan: 'Meera Bai (Blue Arts, Rajasthan)',
        price: 1250,
        syncStatus: ['ONDC Live', 'GeM Live'],
        image: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=400&q=80',
        desc: 'Floral painted classic quartz glazed bowls crafted by GI-registered artists.'
    },
    {
        id: 5,
        title: 'Traditional Beaded Handcrafted Tribal Necklace',
        category: 'Jewelry',
        artisan: 'Champa Soren (Santhal Artisans, Jharkhand)',
        price: 450,
        syncStatus: ['ONDC Live'],
        image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=400&q=80',
        desc: 'Colorful handcrafted glass-bead traditional ornament honoring Santhali craft heritage.'
    },
    {
        id: 6,
        title: 'Hand-painted Madhubani Tree of Life Wall Art',
        category: 'Paintings & Art',
        artisan: 'Kanti Devi (Madhubani Painters, Bihar)',
        price: 3200,
        syncStatus: ['GeM Live'],
        image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=400&q=80',
        desc: 'Traditional Mithila painting on handmade paper using bamboo twigs, brushes, and organic pigment dyes.'
    }
];

let marketplaceProducts = [...initialMarketplaceProducts];

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    // Check backend connection
    checkBackendConnection().then(() => {
        // Load initial databases if connected
        refreshAllDatabases();
    });
    
    // Initial loading of B2B directory
    renderMarketplace();

    // Event Listeners setup
    setupTemplateSelector();
    setupImageUpload();
    setupAudioRecording();
    setupTabSwitching();
    setupFormSubmission();
    setupSliderInteraction();
    setupPublisher();
    setupB2BFilters();

    // Multi-role portal initializations
    setupRoleSwitcher();
    setupAuthListeners();
    setupInquiryModalListeners();
    setupLanguageToggle();
    setupVoiceOnboarding();
});

// 1. Connection check
async function checkBackendConnection() {
    const statusBanner = document.getElementById('connection-status');
    const indicator = statusBanner.querySelector('.status-indicator');
    const text = statusBanner.querySelector('.status-text');

    try {
        const response = await fetch(BACKEND_URL + '/', { method: 'GET' });
        if (response.ok) {
            isLiveMode = true;
            indicator.className = 'status-indicator online';
            text.textContent = 'Live Mode (Connected to FastAPI backend on localhost:8000)';
            showToast('Connected to FastAPI backend!', 'success');
        } else {
            throw new Error('Server returned error status');
        }
    } catch (e) {
        isLiveMode = false;
        indicator.className = 'status-indicator offline';
        text.textContent = 'Demo Mode (Offline - Running Client Simulation)';
        console.log('Backend not available, running in mock simulation mode.');
    }
}

// 2. Predefined Template Logic
let activeTemplateKey = 'dupatta';

function setupTemplateSelector() {
    const buttons = document.querySelectorAll('.btn-template');
    const categorySelect = document.getElementById('input-category');
    const costInput = document.getElementById('input-cost');
    const hoursInput = document.getElementById('input-hours');
    const descriptionText = document.getElementById('text-description');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const templateKey = btn.getAttribute('data-template');
            activeTemplateKey = templateKey;
            
            const template = productTemplates[templateKey];
            if (template) {
                // Populate input fields
                categorySelect.value = template.category;
                costInput.value = template.cost;
                hoursInput.value = template.hours;
                descriptionText.value = template.voiceTranscript;
                
                // Clear any manual image preview to favor template image
                const previewContainer = document.getElementById('preview-container');
                const prompt = document.querySelector('.dropzone-prompt');
                previewContainer.classList.add('hidden');
                prompt.classList.remove('hidden');
                document.getElementById('image-upload').value = '';
                
                showToast(`Loaded ${btn.textContent.trim()} Template`, 'info');
            }
        });
    });
}

// 3. Image Upload Dropzone logic
let uploadedImageFile = null;
let uploadedImageBase64 = null;

function setupImageUpload() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('image-upload');
    const previewContainer = document.getElementById('preview-container');
    const prompt = document.querySelector('.dropzone-prompt');
    const previewImg = document.getElementById('uploaded-image-preview');
    const btnRemove = document.getElementById('btn-remove-image');

    // Drag-over styling
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--primary)';
        dropzone.style.backgroundColor = 'rgba(230, 126, 34, 0.04)';
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'var(--border-color)';
        dropzone.style.backgroundColor = 'var(--bg-surface-elevated)';
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--border-color)';
        dropzone.style.backgroundColor = 'var(--bg-surface-elevated)';
        
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFile(fileInput.files[0]);
        }
    });

    btnRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        resetImageUpload();
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            showToast('Please upload an image file.', 'error');
            return;
        }
        uploadedImageFile = file;

        const reader = new FileReader();
        reader.onload = (event) => {
            uploadedImageBase64 = event.target.result;
            previewImg.src = uploadedImageBase64;
            
            // Show preview, hide upload prompts
            prompt.classList.add('hidden');
            previewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    function resetImageUpload() {
        uploadedImageFile = null;
        uploadedImageBase64 = null;
        fileInput.value = '';
        previewImg.src = '';
        previewContainer.classList.add('hidden');
        prompt.classList.remove('hidden');
    }
}

// 4. Voice Recording Simulation
let isRecording = false;
let recordTimer = null;

function setupAudioRecording() {
    const btnMic = document.getElementById('btn-mic');
    const title = document.getElementById('voice-title');
    const subtitle = document.getElementById('voice-subtitle');
    const waveform = document.getElementById('waveform');
    const descriptionText = document.getElementById('text-description');

    btnMic.addEventListener('click', () => {
        if (!isRecording) {
            // Start recording
            isRecording = true;
            btnMic.classList.add('recording');
            title.textContent = 'Listening... Speak Now';
            subtitle.textContent = 'Recording regional description...';
            waveform.classList.remove('hidden');
            descriptionText.disabled = true;

            // Automatically stop recording after 5 seconds
            recordTimer = setTimeout(() => {
                stopRecordingSimulation();
            }, 5000);
            
            showToast('Recording voice note...', 'info');
        } else {
            // Stop recording early
            stopRecordingSimulation();
        }
    });

    function stopRecordingSimulation() {
        if (!isRecording) return;
        clearTimeout(recordTimer);
        
        isRecording = false;
        btnMic.classList.remove('recording');
        title.textContent = 'Voice Note Recorded!';
        subtitle.textContent = 'Tap to re-record description';
        waveform.classList.add('hidden');
        descriptionText.disabled = false;

        // Auto populate text area based on active template if empty or template default
        const template = productTemplates[activeTemplateKey];
        if (template) {
            descriptionText.value = template.voiceTranscript;
        } else {
            descriptionText.value = 'हाथ से बना हुआ सुंदर उत्पाद सूती धागे से सजाया हुआ।';
        }
        
        showToast('Voice note transcribed successfully!', 'success');
    }
}

// 5. Tab switching logic
function setupTabSwitching() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTabId = btn.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            tabContents.forEach(content => {
                if (content.id === targetTabId) {
                    content.classList.remove('hidden');
                } else {
                    content.classList.add('hidden');
                }
            });
        });
    });
}

// 6. Form Submission & Processing (Live API or Mock Fallback)
function setupFormSubmission() {
    const btnSubmit = document.getElementById('btn-submit');
    const btnSpinner = document.getElementById('btn-spinner');
    const btnText = document.getElementById('btn-text');

    const placeholder = document.getElementById('panel-placeholder');
    const loading = document.getElementById('panel-loading');
    const workspace = document.getElementById('studio-workspace');

    const loadingStage = document.getElementById('loading-stage');
    const loadingDetail = document.getElementById('loading-detail');

    btnSubmit.addEventListener('click', async () => {
        // Collect form data
        const category = document.getElementById('input-category').value;
        const cost = parseFloat(document.getElementById('input-cost').value) || 0.0;
        const hours = parseFloat(document.getElementById('input-hours').value) || 0.0;
        const descText = document.getElementById('text-description').value.trim();

        // 1. Show loading state
        btnSubmit.disabled = true;
        btnSpinner.classList.remove('hidden');
        btnText.textContent = 'Processing...';

        placeholder.classList.add('hidden');
        workspace.classList.add('hidden');
        loading.classList.remove('hidden');

        // Stage 1: BG Removal
        loadingStage.textContent = '1. Enhancing Product Image';
        loadingDetail.textContent = 'Locating boundaries and adjusting studio lighting...';
        
        try {
            let enhancedImgUrl = '';
            let originalImgUrl = '';
            let catalogData = null;
            let pricingData = null;

            if (isLiveMode) {
                // Call real FastAPI Backend
                console.log('Sending requests to FastAPI live server...');
                
                // A. Background removal
                let imgBlob = null;
                if (uploadedImageFile) {
                    // Send actual uploaded file
                    const formData = new FormData();
                    formData.append('file', uploadedImageFile);
                    
                    const res = await fetch(`${BACKEND_URL}/enhance`, {
                        method: 'POST',
                        body: formData
                    });
                    if (res.ok) {
                        imgBlob = await res.blob();
                        enhancedImgUrl = URL.createObjectURL(imgBlob);
                        originalImgUrl = uploadedImageBase64;
                    }
                }

                // If no image uploaded or background removal fails, fall back to template images
                if (!enhancedImgUrl) {
                    const template = productTemplates[activeTemplateKey];
                    originalImgUrl = template.originalImg;
                    enhancedImgUrl = template.enhancedImg;
                }

                // Stage 2: Multilingual Translation
                await sleep(1000);
                loadingStage.textContent = '2. Transcribing & Cataloging';
                loadingDetail.textContent = 'Generating English and Hindi listings using Google Gemini LLM...';

                // Send voice transcript/text description to backend cataloger
                const catalogFormData = new FormData();
                if (descText) {
                    catalogFormData.append('text_desc', descText);
                } else {
                    const template = productTemplates[activeTemplateKey];
                    catalogFormData.append('text_desc', template.voiceTranscript);
                }
                catalogFormData.append('lang', 'Hindi');

                const catalogRes = await fetch(`${BACKEND_URL}/catalog`, {
                    method: 'POST',
                    body: catalogFormData
                });

                if (catalogRes.ok) {
                    catalogData = await catalogRes.json();
                } else {
                    throw new Error('Catalog API Failed');
                }

                // Stage 3: Dynamic Pricing
                await sleep(1000);
                loadingStage.textContent = '3. Dynamic Pricing AI Engine';
                loadingDetail.textContent = 'Aggregating local wage guidelines and competitor ranges...';

                const pricingReqBody = {
                    category: category,
                    material_cost: cost,
                    manufacturing_hours: hours,
                    product_description: catalogData.title_en || descText
                };

                const pricingRes = await fetch(`${BACKEND_URL}/suggest-price`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(pricingReqBody)
                });

                if (pricingRes.ok) {
                    pricingData = await pricingRes.json();
                } else {
                    throw new Error('Pricing API Failed');
                }

            } else {
                // Mock Simulation mode
                await sleep(1200);
                
                // Load active template mock data
                const template = productTemplates[activeTemplateKey];
                
                // B. Background removal simulation
                if (uploadedImageBase64) {
                    originalImgUrl = uploadedImageBase64;
                    // For uploaded image, simulate a background removal by using a glowing filter
                    enhancedImgUrl = uploadedImageBase64;
                } else {
                    originalImgUrl = template.originalImg;
                    enhancedImgUrl = template.enhancedImg;
                }

                // Stage 2: Multilingual Translation Simulation
                loadingStage.textContent = '2. Transcribing & Cataloging';
                loadingDetail.textContent = 'Generating English and Hindi listings using Google Gemini LLM...';
                await sleep(1000);
                
                catalogData = template.catalog;

                // Adjust description if user wrote custom text
                if (descText && descText !== template.voiceTranscript) {
                    catalogData = {
                        ...template.catalog,
                        raw_transcription: descText,
                        description_en: `This beautiful handcrafted item falls under ${category} categories. Specially digitized for artisans to showcase premium heritage design, materials, and quality finishing.`,
                        description_hi: `यह सुंदर हस्तनिर्मित उत्पाद ${category} श्रेणी में आता है। पारंपरिक कला और गुणवत्ता फिनिशिंग को प्रदर्शित करने के लिए विशेष रूप से तैयार किया गया है।`
                    };
                }

                // Stage 3: Pricing Simulation
                loadingStage.textContent = '3. Dynamic Pricing AI Engine';
                loadingDetail.textContent = 'Aggregating local wage guidelines and competitor ranges...';
                await sleep(800);

                const laborRate = 150.0;
                const laborCost = hours * laborRate;
                const productionCost = cost + laborCost;
                
                let markup = 1.4;
                if (category === 'Textiles') markup = 1.5;
                else if (category === 'Jewelry') markup = 1.8;
                else if (category === 'Paintings & Art') markup = 2.0;

                const suggestedRetail = Math.round((productionCost * markup) / 10) * 10;
                const suggestedB2B = Math.round((productionCost * markup * 0.85) / 10) * 10;

                pricingData = {
                    base_material_cost: cost,
                    labor_cost: laborCost,
                    suggested_retail_price: suggestedRetail,
                    suggested_b2b_price: suggestedB2B,
                    competitor_range: `₹ ${Math.round(suggestedRetail * 0.9)} - ₹ ${Math.round(suggestedRetail * 1.3)}`,
                    pricing_strategy_notes: `Highlight the custom ${hours}-hour hand-weaving/manufacturing process. Emphasize the authentic ${category} traditional craftsmanship to justify the premium.`
                };
            }

            // Populate workspace output with results
            populateWorkspace(originalImgUrl, enhancedImgUrl, catalogData, pricingData);

            // Transition UI views
            loading.classList.add('hidden');
            workspace.classList.remove('hidden');
            showToast('AI Studio analysis complete!', 'success');

        } catch (error) {
            console.error(error);
            showToast('API Connection failed. Falling back to Demo Mode.', 'warning');
            isLiveMode = false;
            
            // Execute quick mock fallback
            const template = productTemplates[activeTemplateKey];
            populateWorkspace(template.originalImg, template.enhancedImg, template.catalog, template.pricing);
            
            loading.classList.add('hidden');
            workspace.classList.remove('hidden');
        } finally {
            // Restore button state
            btnSubmit.disabled = false;
            btnSpinner.classList.add('hidden');
            btnText.textContent = '✨ Analyze & Digitize Product';
        }
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 7. Populating results to the Studio Workspace
let lastAnalyzedProduct = null;

function populateWorkspace(originalImg, enhancedImg, catalog, pricing) {
    // A. Image Slider Setup
    document.getElementById('img-original').src = originalImg;
    document.getElementById('img-enhanced').src = enhancedImg;
    
    // Reset slider handle position to 50%
    const handle = document.getElementById('slider-handle');
    const originalWrapper = document.getElementById('img-original-wrapper');
    handle.style.left = '50%';
    originalWrapper.style.width = '50%';

    // B. Catalog Metadata & Texts
    document.getElementById('transcription-lang').textContent = `Language: ${catalog.detected_language || 'Hindi'}`;
    
    // English Tab
    document.getElementById('title-en-val').textContent = catalog.title_en;
    document.getElementById('desc-en-val').textContent = catalog.description_en;
    
    // Hindi Tab
    document.getElementById('title-hi-val').textContent = catalog.title_hi;
    document.getElementById('desc-hi-val').textContent = catalog.description_hi;

    // Materials
    const materialsContainer = document.getElementById('materials-container');
    materialsContainer.innerHTML = '';
    const materials = catalog.materials || [];
    materials.forEach(mat => {
        const span = document.createElement('span');
        span.className = 'badge badge-meta';
        span.textContent = mat;
        materialsContainer.appendChild(span);
    });

    // SEO Tags
    const tagsContainer = document.getElementById('tags-container');
    tagsContainer.innerHTML = '';
    const tags = catalog.tags || [];
    tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'badge badge-tag';
        span.textContent = tag.startsWith('#') ? tag : `#${tag}`;
        tagsContainer.appendChild(span);
    });

    // C. Pricing Breakdown
    document.getElementById('price-retail').textContent = `₹ ${Math.round(pricing.suggested_retail_price).toLocaleString()}`;
    document.getElementById('price-b2b').textContent = `₹ ${Math.round(pricing.suggested_b2b_price).toLocaleString()}`;
    document.getElementById('price-range').textContent = pricing.competitor_range;
    document.getElementById('pricing-strategy-val').textContent = pricing.pricing_strategy_notes;

    // Pricing Ledger
    document.getElementById('ledger-material').textContent = `₹ ${(pricing.base_material_cost || pricing.ledgerMaterial || 0).toFixed(2)}`;
    document.getElementById('ledger-labor').textContent = `₹ ${(pricing.labor_cost || pricing.ledgerLabor || 0).toFixed(2)}`;
    
    const totalCost = (pricing.base_material_cost || pricing.ledgerMaterial || 0) + (pricing.labor_cost || pricing.ledgerLabor || 0);
    document.getElementById('ledger-total').textContent = `₹ ${totalCost.toFixed(2)}`;

    // Store reference of last analyzed item for syncing
    lastAnalyzedProduct = {
        title: catalog.title_en,
        category: catalog.category || 'Handicrafts',
        artisan: 'Ram Lal (Artisan Local Cooperative)',
        price: Math.round(pricing.suggested_retail_price),
        image: enhancedImg,
        desc: catalog.description_en
    };
}

// 8. Image slider interaction dragging logic
function setupSliderInteraction() {
    const container = document.querySelector('.img-slider-container');
    const handle = document.getElementById('slider-handle');
    const originalWrapper = document.getElementById('img-original-wrapper');
    
    let isDragging = false;

    // Start Dragging
    handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        e.preventDefault();
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        moveSlider(e.clientX);
    });

    // Touch Support for mobile
    handle.addEventListener('touchstart', (e) => {
        isDragging = true;
    });

    window.addEventListener('touchend', () => {
        isDragging = false;
    });

    window.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        if (e.touches.length > 0) {
            moveSlider(e.touches[0].clientX);
        }
    });

    function moveSlider(clientX) {
        const containerRect = container.getBoundingClientRect();
        let offsetX = clientX - containerRect.left;
        
        // Boundaries
        if (offsetX < 0) offsetX = 0;
        if (offsetX > containerRect.width) offsetX = containerRect.width;

        // Calculate percentage
        const percentage = (offsetX / containerRect.width) * 100;
        
        // Update DOM styles
        handle.style.left = `${percentage}%`;
        originalWrapper.style.width = `${percentage}%`;
    }
}

// 9. Publisher Integration Simulator (ONDC sync)
function setupPublisher() {
    const btnExport = document.getElementById('btn-export');
    const btnCancel = document.getElementById('btn-recapture');

    btnExport.addEventListener('click', async () => {
        if (!lastAnalyzedProduct) return;

        btnExport.disabled = true;
        btnExport.textContent = 'Synchronizing with ONDC registries...';
        
        await sleep(1500);

        const newProduct = {
            title_en: lastAnalyzedProduct.title,
            title_hi: productTemplates[activeTemplateKey].catalog.title_hi,
            description_en: lastAnalyzedProduct.desc,
            description_hi: productTemplates[activeTemplateKey].catalog.description_hi,
            category: lastAnalyzedProduct.category,
            materials: productTemplates[activeTemplateKey].catalog.materials,
            tags: productTemplates[activeTemplateKey].catalog.tags,
            retail_price: lastAnalyzedProduct.price,
            b2b_price: Math.round(lastAnalyzedProduct.price * 0.85),
            stock: 10,
            image_url: lastAnalyzedProduct.image,
            artisan_name: "Ram Lal",
            artisan_coop: "Varanasi Handloom Cooperative"
        };

        if (isLiveMode) {
            try {
                const token = localStorage.getItem('token');
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch(`${BACKEND_URL}/products`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(newProduct)
                });
                if (res.ok) {
                    showToast('🎉 Product synchronized & saved to database!', 'success');
                    refreshAllDatabases();
                } else {
                    throw new Error('Database save failed');
                }
            } catch (err) {
                console.error(err);
                showToast('Failed to save to live database. Added to local demo.', 'warning');
                // Mock fallback
                marketplaceProducts.unshift({
                    id: marketplaceProducts.length + 1,
                    title: newProduct.title_en,
                    category: newProduct.category,
                    artisan: newProduct.artisan_name,
                    price: newProduct.retail_price,
                    syncStatus: ['ONDC Live', 'GeM Live'],
                    image: newProduct.image_url,
                    desc: newProduct.description_en
                });
            }
        } else {
            // Mock fallback
            marketplaceProducts.unshift({
                id: marketplaceProducts.length + 1,
                title: newProduct.title_en,
                category: newProduct.category,
                artisan: newProduct.artisan_name,
                price: newProduct.retail_price,
                syncStatus: ['ONDC Live', 'GeM Live'],
                image: newProduct.image_url,
                desc: newProduct.description_en
            });
            showToast('🎉 Product successfully exported to ONDC & GeM Network!', 'success');
        }

        renderMarketplace();
        resetStudioPlayground();
        document.getElementById('marketplace').scrollIntoView({ behavior: 'smooth' });
    });

    btnCancel.addEventListener('click', () => {
        resetStudioPlayground();
        showToast('Catalog studio reset', 'info');
    });

    function resetStudioPlayground() {
        document.getElementById('panel-placeholder').classList.remove('hidden');
        document.getElementById('studio-workspace').classList.add('hidden');
        document.getElementById('panel-loading').classList.add('hidden');
        lastAnalyzedProduct = null;
        
        // Reset upload elements
        document.getElementById('image-upload').value = '';
        document.getElementById('uploaded-image-preview').src = '';
        document.getElementById('preview-container').classList.add('hidden');
        document.querySelector('.dropzone-prompt').classList.remove('hidden');
    }
}

// 10. Copy-to-clipboard functionality
const copyButtons = document.querySelectorAll('.btn-copy');
copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const textVal = document.getElementById(targetId).textContent;
        
        navigator.clipboard.writeText(textVal).then(() => {
            btn.textContent = 'Copied!';
            btn.style.color = 'var(--success)';
            setTimeout(() => {
                btn.textContent = 'Copy';
                btn.style.color = 'var(--primary)';
            }, 2000);
            showToast('Text copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Copy failed: ', err);
        });
    });
});

// 11. B2B Marketplace Showcase rendering & filtering
let activeFilter = 'all';

function setupB2BFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            activeFilter = btn.getAttribute('data-filter');
            renderMarketplace();
        });
    });
}

function renderMarketplace() {
    const grid = document.getElementById('marketplace-grid');
    grid.innerHTML = '';

    const filtered = activeFilter === 'all' 
        ? marketplaceProducts 
        : marketplaceProducts.filter(p => p.category === activeFilter);

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-8 text-zinc-500" style="grid-column: 1 / -1; padding: 48px; color: var(--text-muted);">
                No verified products available in this category yet.
            </div>
        `;
        return;
    }

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        // Generate sync status labels
        let badgeHtml = '';
        p.syncStatus.forEach(status => {
            const class_name = status.includes('GeM') ? 'badge-sync gem' : (status.includes('Syncing') ? 'badge-sync syncing' : 'badge-sync ondc');
            badgeHtml += `<span class="${class_name}">${status}</span>`;
        });

        card.innerHTML = `
            <div class="product-thumb">
                <img src="${p.image}" alt="${p.title}">
                <div class="product-status-badges">${badgeHtml}</div>
            </div>
            <div class="product-info">
                <span class="product-category">${p.category}</span>
                <h4>${p.title}</h4>
                <p class="product-desc">${p.desc}</p>
                <div class="product-price-row">
                    <div class="price-box">
                        <span class="price-lbl">Artisan Maker</span>
                        <span class="price-val" style="font-size: 0.78rem; font-weight:500; font-family:var(--font-body); color:var(--text-secondary);">${p.artisan}</span>
                    </div>
                    <div class="price-box" style="text-align: right;">
                        <span class="price-lbl">Retail Price</span>
                        <span class="price-val retail">₹ ${p.price.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// 12. Toast notifications system helper
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '✨';
    if (type === 'success') icon = '✓';
    else if (type === 'warning') icon = '⚠';
    else if (type === 'error') icon = '✕';
    else if (type === 'info') icon = 'ℹ';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Auto-remove toast after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 4000);
}

// --- Multi-Role Dashboards & API Integrations ---

let currentUser = null;

// Helper to refresh listings from database
async function refreshAllDatabases() {
    if (!isLiveMode) return;
    try {
        const res = await fetch(`${BACKEND_URL}/products`);
        if (res.ok) {
            const data = await res.json();
            if (data.length > 0) {
                // Map database products to UI expected structure
                marketplaceProducts = data.map(p => ({
                    id: p.id,
                    title: p.title_en,
                    category: p.category,
                    artisan: p.artisan_name || "Independent Artisan",
                    price: p.retail_price,
                    syncStatus: p.status === "Active" ? ['ONDC Live', 'GeM Live'] : [p.status],
                    image: p.image_url || 'https://images.unsplash.com/photo-1610116306796-6ebd30d779c6?w=200',
                    desc: p.description_en
                }));
                renderMarketplace();
            }
        }
    } catch (e) {
        console.error("Error updating listings database", e);
    }
}

// 1. Role switcher layout toggle routing
function setupRoleSwitcher() {
    const roleSelect = document.getElementById('role-select');
    const navLogo = document.getElementById('nav-logo');
    const authModal = document.getElementById('auth-modal');

    const views = {
        public: document.getElementById('public-view'),
        artisan: document.getElementById('artisan-view'),
        buyer: document.getElementById('buyer-view'),
        aggregator: document.getElementById('aggregator-view'),
        admin: document.getElementById('admin-view')
    };

    let previousRole = 'public';

    roleSelect.addEventListener('change', () => {
        const activeRole = roleSelect.value;

        // Check if trying to access secure portal
        if (activeRole !== 'public') {
            // Check if logged in
            if (!currentUser) {
                const warnMsg = currentLanguage === 'English' 
                    ? "Please sign in to access secure dashboard portals." 
                    : "सुरक्षित डैशबोर्ड पोर्टल तक पहुँचने के लिए कृपया साइन इन करें।";
                showToast(warnMsg, 'warning');
                roleSelect.value = previousRole;
                authModal.classList.remove('hidden');
                document.body.classList.add('modal-open');
                return;
            }

            // Check role permissions (Admins bypass all guards)
            if (currentUser.role !== 'Admin') {
                let isAllowed = false;
                if (activeRole === 'artisan' && currentUser.role === 'Artisan') isAllowed = true;
                else if (activeRole === 'buyer' && currentUser.role === 'Buyer') isAllowed = true;
                else if (activeRole === 'aggregator' && currentUser.role === 'Aggregator') isAllowed = true;

                if (!isAllowed) {
                    const errMsg = currentLanguage === 'English' 
                        ? `Access Denied: Your account role (${currentUser.role}) does not have permission for this portal.` 
                        : `पहुंच अस्वीकृत: आपके खाता रोल (${currentUser.role}) को इस पोर्टल के लिए अनुमति नहीं है।`;
                    showToast(errMsg, 'error');
                    roleSelect.value = previousRole;
                    return;
                }
            }
        }

        // Update previousRole tracker
        previousRole = activeRole;
        
        // Hide all views
        Object.values(views).forEach(v => v.classList.add('hidden'));
        
        // Show selected view
        if (views[activeRole]) {
            views[activeRole].classList.remove('hidden');
        }

        // Initialize specific view data
        if (activeRole === 'artisan') {
            loadArtisanDashboard();
        } else if (activeRole === 'buyer') {
            loadBuyerDashboard();
        } else if (activeRole === 'aggregator') {
            loadAggregatorDashboard();
        } else if (activeRole === 'admin') {
            loadAdminDashboard();
        }
    });

    navLogo.addEventListener('click', () => {
        roleSelect.value = 'public';
        roleSelect.dispatchEvent(new Event('change'));
    });

    // Sub-navigation view toggling inside dashboards
    const setupSubNav = (wrapperId) => {
        const wrapper = document.getElementById(wrapperId);
        if (!wrapper) return;
        const links = wrapper.querySelectorAll('.dash-link');
        const panels = wrapper.querySelectorAll('.dashboard-view-panel');

        links.forEach(link => {
            link.addEventListener('click', () => {
                links.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                const targetPanelId = 'panel-' + link.getAttribute('data-view');
                panels.forEach(p => {
                    if (p.id === targetPanelId) {
                        p.classList.remove('hidden');
                    } else {
                        p.classList.add('hidden');
                    }
                });
            });
        });
    };

    setupSubNav('artisan-view');
    setupSubNav('buyer-view');
    setupSubNav('aggregator-view');
    setupSubNav('admin-view');

    // Trigger open studio simulator button from artisan workspace
    document.getElementById('btn-goto-studio').addEventListener('click', (e) => {
        e.preventDefault();
        roleSelect.value = 'public';
        roleSelect.dispatchEvent(new Event('change'));
        document.getElementById('studio').scrollIntoView({ behavior: 'smooth' });
    });
}

// 2. Authentication Logic (Login / Registration)
function setupAuthListeners() {
    const authBtn = document.getElementById('btn-auth-trigger');
    const authModal = document.getElementById('auth-modal');
    const authClose = document.getElementById('btn-auth-close');
    const loginPanel = document.getElementById('auth-login-panel');
    const registerPanel = document.getElementById('auth-register-panel');
    
    const gotoRegister = document.getElementById('link-goto-register');
    const gotoLogin = document.getElementById('link-goto-login');

    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');

    // Auto load current user from token
    if (localStorage.getItem('token')) {
        getCurrentUser();
    }

    const openAuthModal = () => {
        authModal.classList.remove('hidden');
        document.body.classList.add('modal-open');
    };
    const closeAuthModal = () => {
        authModal.classList.add('hidden');
        document.body.classList.remove('modal-open');
    };

    authBtn.addEventListener('click', () => {
        if (currentUser) {
            // Logout
            localStorage.removeItem('token');
            currentUser = null;
            authBtn.textContent = 'Login';
            showToast('Logged out successfully', 'info');
            // Reset views
            document.getElementById('role-select').value = 'public';
            document.getElementById('role-select').dispatchEvent(new Event('change'));
        } else {
            // Open modal
            loginPanel.classList.remove('hidden');
            registerPanel.classList.add('hidden');
            openAuthModal();
        }
    });

    authClose.addEventListener('click', closeAuthModal);
    // Close on overlay background click
    authModal.addEventListener('click', (e) => { if (e.target === authModal) closeAuthModal(); });
    gotoRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginPanel.classList.add('hidden');
        registerPanel.classList.remove('hidden');
    });
    gotoLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerPanel.classList.add('hidden');
        loginPanel.classList.remove('hidden');
    });

    // Login Form Submit
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        if (isLiveMode) {
            try {
                const res = await fetch(`${BACKEND_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                if (res.ok) {
                    const data = await res.json();
                    localStorage.setItem('token', data.access_token);
                    showToast(`Welcome back, ${data.username}!`, 'success');
                    authModal.classList.add('hidden');
                    formLogin.reset();
                    getCurrentUser();
                } else {
                    const err = await res.json();
                    showToast(err.detail || 'Login failed', 'error');
                }
            } catch (err) {
                showToast('Authentication backend offline.', 'warning');
            }
        } else {
            // Mock Login
            currentUser = { 
                username, 
                role: 'Artisan', 
                is_verified: true,
                region: 'Varanasi, UP',
                preferred_lang: 'Hindi',
                craft_type: 'Handloom Silk Weaving',
                aadhaar_number: '123456789012'
            };
            authBtn.textContent = 'Logout (' + username + ')';
            authModal.classList.add('hidden');
            formLogin.reset();
            showToast(`Mock logged in as ${username}`, 'success');
            document.getElementById('role-select').value = 'artisan';
            document.getElementById('role-select').dispatchEvent(new Event('change'));
        }
    });

    // Dynamically toggle Artisan-only registration fields
    const registerRole = document.getElementById('register-role');
    const craftGroup = document.getElementById('register-craft-group');
    const aadhaarGroup = document.getElementById('register-aadhaar-group');

    const toggleArtisanFields = () => {
        if (registerRole.value === 'Artisan') {
            craftGroup.classList.remove('hidden');
            aadhaarGroup.classList.remove('hidden');
        } else {
            craftGroup.classList.add('hidden');
            aadhaarGroup.classList.add('hidden');
        }
    };
    registerRole.addEventListener('change', toggleArtisanFields);
    // Initialize state
    toggleArtisanFields();

    // Register Form Submit
    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const role = registerRole.value;
        const region = document.getElementById('register-region').value;
        const preferred_lang = document.getElementById('register-lang').value;
        const craft_type = role === 'Artisan' ? document.getElementById('register-craft').value : null;
        const aadhaar_number = role === 'Artisan' ? document.getElementById('register-aadhaar').value : null;

        if (isLiveMode) {
            try {
                const res = await fetch(`${BACKEND_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        username, 
                        password, 
                        role, 
                        region, 
                        preferred_lang, 
                        craft_type, 
                        aadhaar_number 
                    })
                });
                if (res.ok) {
                    showToast('Registration successful! Please login.', 'success');
                    registerPanel.classList.add('hidden');
                    loginPanel.classList.remove('hidden');
                    formRegister.reset();
                    toggleArtisanFields();
                } else {
                    const err = await res.json();
                    showToast(err.detail || 'Registration failed', 'error');
                }
            } catch (err) {
                showToast('Registration backend offline.', 'warning');
            }
        } else {
            showToast('Mock Registration complete. Please Login.', 'success');
            registerPanel.classList.add('hidden');
            loginPanel.classList.remove('hidden');
            formRegister.reset();
            toggleArtisanFields();
        }
    });
}

async function getCurrentUser() {
    if (!isLiveMode) return;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${BACKEND_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            currentUser = await res.json();
            document.getElementById('btn-auth-trigger').textContent = `Logout (${currentUser.username})`;
            
            // Auto align role selector
            const roleSelector = document.getElementById('role-select');
            if (currentUser.role === 'Artisan') roleSelector.value = 'artisan';
            else if (currentUser.role === 'Buyer') roleSelector.value = 'buyer';
            else if (currentUser.role === 'Aggregator') roleSelector.value = 'aggregator';
            else if (currentUser.role === 'Admin') roleSelector.value = 'admin';
            roleSelector.dispatchEvent(new Event('change'));
        }
    } catch (e) {
        console.log("Could not load authenticated user profile.", e);
    }
}

// 3. Artisan Dashboard Rendering
async function loadArtisanDashboard() {
    const listContainer = document.getElementById('artisan-products-list');
    listContainer.innerHTML = '<tr><td colspan="8" style="text-align:center;">Loading products...</td></tr>';

    const inqContainer = document.getElementById('artisan-inquiries-list');
    inqContainer.innerHTML = '<div style="text-align:center; padding: 24px;">Loading inquiries...</div>';

    const notiContainer = document.getElementById('artisan-notifications-list');
    notiContainer.innerHTML = '<div style="text-align:center; padding: 24px;">Loading announcements...</div>';

    if (currentUser) {
        document.getElementById('artisan-welcome').textContent = `${currentUser.username}'s Artisan Workspace`;
        document.getElementById('artisan-badge-verify').textContent = currentUser.is_verified ? "Verified Artisan" : "Verification Pending";
        document.getElementById('artisan-badge-verify').className = currentUser.is_verified ? "badge badge-success" : "badge badge-sync syncing";
        
        // Populate profile panel inputs
        document.getElementById('profile-username').value = currentUser.username;
        document.getElementById('profile-region').value = currentUser.region || 'Not Provided';
        document.getElementById('profile-lang').value = currentUser.preferred_lang || 'Hindi';
        document.getElementById('profile-craft').value = currentUser.craft_type || 'Not Tagged';
        
        const aadhaarNum = currentUser.aadhaar_number;
        document.getElementById('profile-aadhaar').value = aadhaarNum 
            ? aadhaarNum.slice(0, 4) + ' ' + '**** ****' 
            : 'Not Provided';
            
        const statusBadge = document.getElementById('artisan-profile-status-badge');
        if (statusBadge) {
            statusBadge.textContent = currentUser.is_verified ? '✓ Approved & Verified' : '⏳ Pending KYC Approval';
            statusBadge.className = currentUser.is_verified ? 'badge badge-success' : 'badge badge-sync';
        }
    }

    if (isLiveMode) {
        try {
            // A. Fetch Products
            const res = await fetch(`${BACKEND_URL}/products`);
            if (res.ok) {
                const products = await res.json();
                listContainer.innerHTML = '';
                
                // Filter products that belong to this artisan
                const myProducts = currentUser 
                    ? products.filter(p => p.artisan_id === currentUser.id)
                    : products;

                if (myProducts.length === 0) {
                    listContainer.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">No products registered yet. Try adding one in the studio.</td></tr>';
                } else {
                    myProducts.forEach(p => {
                        const tr = document.createElement('tr');
                        const statusClass = p.status === 'Active' ? 'badge-success' : 'badge-sync syncing';
                        tr.innerHTML = `
                            <td><img src="${p.image_url}" style="width: 44px; height: 44px; object-fit: cover; border-radius:4px;"></td>
                            <td style="font-weight:600; color:var(--text-primary);">${p.title_en}</td>
                            <td>${p.category}</td>
                            <td style="font-weight:600; color:var(--primary);">₹ ${p.retail_price}</td>
                            <td>₹ ${p.b2b_price}</td>
                            <td>${p.stock}</td>
                            <td><span class="${statusClass}" style="font-size:0.7rem; padding: 2px 6px;">${p.status}</span></td>
                            <td>
                                <button class="btn-action-sm btn-success-sm" onclick="toggleProductStatus(${p.id}, '${p.status === 'Active' ? 'Sold Out' : 'Active'}')">
                                    Toggle Stock
                                </button>
                            </td>
                        `;
                        listContainer.appendChild(tr);
                    });
                }
            }

            // B. Fetch Inquiries
            const inqRes = await fetch(`${BACKEND_URL}/inquiries`);
            if (inqRes.ok) {
                const inquiries = await inqRes.json();
                inqContainer.innerHTML = '';
                
                // Filter inquiries belonging to current artisan's products
                const myInq = currentUser
                    ? inquiries.filter(i => i.product.artisan_id === currentUser.id)
                    : inquiries;

                document.getElementById('artisan-inq-count').style.display = myInq.length > 0 ? 'inline-block' : 'none';
                document.getElementById('artisan-inq-count').textContent = myInq.length;

                if (myInq.length === 0) {
                    inqContainer.innerHTML = '<div style="text-align:center; padding: 48px; color: var(--text-muted);">No bulk inquiries received yet.</div>';
                } else {
                    myInq.forEach(i => {
                        const card = document.createElement('div');
                        card.className = 'inquiry-card';
                        card.innerHTML = `
                            <div class="inquiry-header-row">
                                <div>
                                    <span class="inquiry-title">${i.buyer_name} (Requested Quotation)</span>
                                    <div class="inquiry-meta">Product: <strong>${i.product.title_en}</strong> | Quantity: <strong>${i.quantity} pcs</strong></div>
                                </div>
                                <span class="badge-sync" style="background-color:var(--primary);">${i.status}</span>
                            </div>
                            <p class="inquiry-note">"${i.notes || 'No message left'}"</p>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:8px; text-align:right;">Contact Email: <a href="mailto:${i.buyer_email}" style="color:var(--primary); text-decoration:underline;">${i.buyer_email}</a></div>
                        `;
                        inqContainer.appendChild(card);
                    });
                }
            }

            // C. Fetch Announcements
            const alertRes = await fetch(`${BACKEND_URL}/notifications`);
            if (alertRes.ok) {
                const alerts = await alertRes.json();
                notiContainer.innerHTML = '';
                
                const myAlerts = alerts.filter(a => a.target_role === 'All' || a.target_role === 'Artisan');

                if (myAlerts.length === 0) {
                    notiContainer.innerHTML = '<div style="text-align:center; padding: 48px; color: var(--text-muted);">No system announcements broadcasted yet.</div>';
                } else {
                    myAlerts.forEach(a => {
                        const div = document.createElement('div');
                        div.className = 'inquiry-card';
                        div.innerHTML = `
                            <div style="font-weight:600; color:var(--primary); margin-bottom: 6px;">📢 ${a.title}</div>
                            <p style="font-size:0.8rem; color:var(--text-secondary); line-height:1.4;">${a.message}</p>
                        `;
                        notiContainer.appendChild(div);
                    });
                }
            }
        } catch (e) {
            console.error(e);
        }
    } else {
        // Mock data rendering
        listContainer.innerHTML = `
            <tr>
                <td><img src="https://images.unsplash.com/photo-1610116306796-6ebd30d779c6?w=100" style="width: 44px; height: 44px; object-fit: cover; border-radius:4px;"></td>
                <td style="font-weight:600; color:var(--text-primary);">Banarasi Silk Dupatta</td>
                <td>Textiles</td>
                <td style="font-weight:600; color:var(--primary);">₹ 1,550</td>
                <td>₹ 1,320</td>
                <td>10</td>
                <td><span class="badge-success" style="font-size:0.7rem; padding: 2px 6px;">Active</span></td>
                <td><button class="btn-action-sm btn-success-sm" onclick="showToast('Mock status toggled')">Toggle Stock</button></td>
            </tr>
        `;
        inqContainer.innerHTML = '<div style="text-align:center; padding: 48px; color: var(--text-muted);">No bulk inquiries received yet (Demo Mode).</div>';
        notiContainer.innerHTML = `
            <div class="inquiry-card">
                <div style="font-weight:600; color:var(--primary); margin-bottom: 6px;">📢 Artisan Financial Literacy Workshop</div>
                <p style="font-size:0.8rem; color:var(--text-secondary); line-height:1.4;">MoSJE is organizing a regional workshop on ONDC cataloging and digital banking systems on September 5th. Registration is free.</p>
            </div>
        `;
    }
}

// Toggle product status helper (global namespace binding for HTML onclicks)
window.toggleProductStatus = async function(productId, newStatus) {
    if (!isLiveMode) return;
    try {
        const formData = new FormData();
        formData.append('status', newStatus);
        const res = await fetch(`${BACKEND_URL}/products/${productId}`, {
            method: 'PUT',
            body: formData
        });
        if (res.ok) {
            showToast('Stock status updated successfully!', 'success');
            loadArtisanDashboard();
            refreshAllDatabases();
        }
    } catch (e) {
        showToast('Error updating product status', 'error');
    }
};

// 4. B2B Buyer Dashboard Rendering
async function loadBuyerDashboard() {
    const searchInput = document.getElementById('buyer-search-input');
    const catSelect = document.getElementById('buyer-category-filter');
    
    // Add event listeners once
    if (!searchInput.dataset.hasListener) {
        searchInput.dataset.hasListener = "true";
        searchInput.addEventListener('input', () => renderBuyerCatalog());
        catSelect.addEventListener('change', () => renderBuyerCatalog());
    }

    renderBuyerCatalog();
    loadBuyerSentQuotes();
}

async function renderBuyerCatalog() {
    const grid = document.getElementById('buyer-products-grid');
    grid.innerHTML = '<div class="col-span-full text-center py-8 text-zinc-500">Loading catalog items...</div>';

    const search = document.getElementById('buyer-search-input').value.trim();
    const category = document.getElementById('buyer-category-filter').value;

    if (isLiveMode) {
        try {
            let url = `${BACKEND_URL}/products`;
            const params = [];
            if (category && category !== 'all') params.push(`category=${category}`);
            if (search) params.push(`search=${encodeURIComponent(search)}`);
            if (params.length > 0) url += `?${params.join('&')}`;

            const res = await fetch(url);
            if (res.ok) {
                const products = await res.json();
                grid.innerHTML = '';
                if (products.length === 0) {
                    grid.innerHTML = '<div class="col-span-full text-center py-8 text-zinc-500" style="grid-column: 1/-1; padding: 48px; color: var(--text-muted);">No verified products match your query.</div>';
                    return;
                }
                products.forEach(p => {
                    const card = document.createElement('div');
                    card.className = 'product-card';
                    card.innerHTML = `
                        <div class="product-thumb">
                            <img src="${p.image_url || 'https://images.unsplash.com/photo-1610116306796-6ebd30d779c6?w=200'}" alt="${p.title_en}">
                            <div class="product-status-badges"><span class="badge-sync ondc">ONDC Live</span></div>
                        </div>
                        <div class="product-info">
                            <span class="product-category">${p.category}</span>
                            <h4>${p.title_en}</h4>
                            <p class="product-desc">${p.description_en}</p>
                            <div class="product-price-row" style="margin-bottom: 12px;">
                                <div class="price-box">
                                    <span class="price-lbl">Retail Price</span>
                                    <span class="price-val retail">₹ ${p.retail_price.toLocaleString()}</span>
                                </div>
                                <div class="price-box" style="text-align: right;">
                                    <span class="price-lbl">B2B Bulk Price</span>
                                    <span class="price-val" style="color:var(--text-primary);">₹ ${p.b2b_price.toLocaleString()}</span>
                                </div>
                            </div>
                            <button type="button" class="btn btn-primary btn-sm btn-full" onclick="openInquiryModal(${p.id}, '${p.title_en.replace(/'/g, "\\'")}')">
                                Submit Bulk Quote
                            </button>
                        </div>
                    `;
                    grid.appendChild(card);
                });
            }
        } catch (e) {
            console.error(e);
        }
    } else {
        // Fallback mock rendering using active filters
        grid.innerHTML = '';
        const filtered = marketplaceProducts.filter(p => {
            if (category !== 'all' && p.category !== category) return false;
            if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });

        if (filtered.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center" style="grid-column: 1/-1; padding: 48px; color: var(--text-muted);">No products found.</div>';
            return;
        }

        filtered.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-thumb">
                    <img src="${p.image}" alt="${p.title}">
                </div>
                <div class="product-info">
                    <span class="product-category">${p.category}</span>
                    <h4>${p.title}</h4>
                    <p class="product-desc">${p.desc}</p>
                    <div class="product-price-row" style="margin-bottom:12px;">
                        <div class="price-box">
                            <span class="price-lbl">Retail Price</span>
                            <span class="price-val retail">₹ ${p.price.toLocaleString()}</span>
                        </div>
                        <div class="price-box" style="text-align: right;">
                            <span class="price-lbl">B2B Bulk Price</span>
                            <span class="price-val">₹ ${Math.round(p.price * 0.85).toLocaleString()}</span>
                        </div>
                    </div>
                    <button type="button" class="btn btn-primary btn-sm btn-full" onclick="openInquiryModal(${p.id}, '${p.title.replace(/'/g, "\\'")}')">
                        Submit Bulk Quote
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
    }
}

async function loadBuyerSentQuotes() {
    const list = document.getElementById('buyer-quotes-list');
    list.innerHTML = '<div style="text-align:center; padding: 24px;">Loading quotes...</div>';

    if (isLiveMode) {
        try {
            const res = await fetch(`${BACKEND_URL}/inquiries`);
            if (res.ok) {
                const data = await res.json();
                list.innerHTML = '';
                if (data.length === 0) {
                    list.innerHTML = '<div style="text-align:center; padding: 48px; color: var(--text-muted);">You have not sent any quotation requests yet.</div>';
                } else {
                    data.forEach(i => {
                        const card = document.createElement('div');
                        card.className = 'inquiry-card';
                        card.innerHTML = `
                            <div class="inquiry-header-row">
                                <div>
                                    <span class="inquiry-title">Item: ${i.product.title_en}</span>
                                    <div class="inquiry-meta">Quantity Requested: <strong>${i.quantity} pcs</strong> | Target Price: <strong>₹ ${i.product.b2b_price}</strong></div>
                                </div>
                                <span class="badge-sync gem">${i.status}</span>
                            </div>
                            <p class="inquiry-note">"${i.notes || 'No notes'}"</p>
                        `;
                        list.appendChild(card);
                    });
                }
            }
        } catch (e) {
            console.error(e);
        }
    } else {
        list.innerHTML = '<div style="text-align:center; padding: 48px; color: var(--text-muted);">Quotation lists are only active in Live Database Mode.</div>';
    }
}

// Modal handling triggers
window.openInquiryModal = function(productId, title) {
    document.getElementById('inquiry-product-id').value = productId;
    document.getElementById('inquiry-product-title').value = title;
    document.getElementById('inquiry-modal').classList.remove('hidden');
};

function setupInquiryModalListeners() {
    const modal = document.getElementById('inquiry-modal');
    const btnClose = document.getElementById('btn-inquiry-close');
    const form = document.getElementById('form-inquiry');

    btnClose.addEventListener('click', () => modal.classList.add('hidden'));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pId = parseInt(document.getElementById('inquiry-product-id').value);
        const name = document.getElementById('inquiry-buyer-name').value;
        const email = document.getElementById('inquiry-buyer-email').value;
        const qty = parseInt(document.getElementById('inquiry-qty').value);
        const notes = document.getElementById('inquiry-notes').value.trim();

        if (isLiveMode) {
            try {
                const res = await fetch(`${BACKEND_URL}/inquiries`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        product_id: pId,
                        buyer_name: name,
                        buyer_email: email,
                        quantity: qty,
                        notes: notes
                    })
                });
                if (res.ok) {
                    showToast('Bulk Inquiry Quotation submitted!', 'success');
                    modal.classList.add('hidden');
                    form.reset();
                    loadBuyerSentQuotes();
                } else {
                    showToast('Submission failed', 'error');
                }
            } catch (err) {
                console.error(err);
            }
        } else {
            showToast('Demo Mode: Inquiry quotation submitted!', 'success');
            modal.classList.add('hidden');
            form.reset();
        }
    });
}

// 5. Cluster Aggregator Rendering
async function loadAggregatorDashboard() {
    const list = document.getElementById('aggregator-artisans-list');
    list.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading cooperative database...</td></tr>';

    if (isLiveMode) {
        try {
            const res = await fetch(`${BACKEND_URL}/admin/users`);
            if (res.ok) {
                const users = await res.json();
                list.innerHTML = '';
                
                const artisans = users.filter(u => u.role === 'Artisan');
                if (artisans.length === 0) {
                    list.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No cooperative artisans registered.</td></tr>';
                } else {
                    artisans.forEach(u => {
                        const tr = document.createElement('tr');
                        const statusClass = u.is_verified ? 'badge-success' : 'badge-sync syncing';
                        tr.innerHTML = `
                            <td>#00${u.id}</td>
                            <td style="font-weight:600; color:var(--text-primary);">${u.username}</td>
                            <td>${u.region || 'Varanasi'}</td>
                            <td>Handloom / Textiles</td>
                            <td>${u.is_verified ? 'Aadhaar Verified' : 'Pending Verification'}</td>
                            <td><span class="${statusClass}">${u.is_verified ? 'Active' : 'Pending'}</span></td>
                        `;
                        list.appendChild(tr);
                    });
                }
            }
        } catch (e) {
            console.error(e);
        }
    } else {
        list.innerHTML = `
            <tr>
                <td>#001</td>
                <td style="font-weight:600; color:var(--text-primary);">Sunita Devi</td>
                <td>Varanasi</td>
                <td>Weaving & Textiles</td>
                <td>Aadhaar Verified</td>
                <td><span class="badge-success">Active</span></td>
            </tr>
        `;
    }

    // Ingestion script setup
    document.getElementById('btn-bulk-ingest').onclick = async () => {
        if (!isLiveMode) {
            showToast('Uploaded stock list: Ingested 10 products successfully!', 'success');
            return;
        }
        
        showToast('Processing bulk ingestion sheets...', 'info');
        const sampleProducts = [
            { title_en: "Channapatna Wooden Stacking rings", title_hi: "चनपटना लकड़ी के छल्ले", category: "Handicrafts", materials: ["Wrightia Tinctoria Wood"], tags: ["wooden toys", "crafts"], retail_price: 490, b2b_price: 390, image_url: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=200" },
            { title_en: "Phulkari Embroidered Georgette Dupatta", title_hi: "फुलकारी कढ़ाई दुपट्टा", category: "Textiles", materials: ["Georgette", "Cotton Thread"], tags: ["phulkari", "dupatta"], retail_price: 1250, b2b_price: 980, image_url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=200" },
            { title_en: "Terracotta Handcrafted Serving Bowls (Set of 4)", title_hi: "टेराकोटा सर्विंग बाउल", category: "Pottery", materials: ["Natural Clay"], tags: ["terracotta", "pottery"], retail_price: 890, b2b_price: 720, image_url: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=200" }
        ];

        try {
            for (let p of sampleProducts) {
                await fetch(`${BACKEND_URL}/products`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(p)
                });
            }
            showToast('🚀 Bulk catalog ingestion complete! 3 sample products published.', 'success');
            refreshAllDatabases();
        } catch (e) {
            showToast('Ingestion sync failed', 'error');
        }
    };
}

// 6. MoSJE Admin Dashboard Rendering
async function loadAdminDashboard() {
    loadAdminAnalytics();
    loadAdminVerificationPipeline();
    
    // Broadcast message form
    const formBroadcast = document.getElementById('form-broadcast');
    if (!formBroadcast.dataset.hasListener) {
        formBroadcast.dataset.hasListener = "true";
        formBroadcast.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('announcement-title').value;
            const message = document.getElementById('announcement-message').value;
            const role = document.getElementById('announcement-role').value;

            if (isLiveMode) {
                try {
                    const res = await fetch(`${BACKEND_URL}/notifications`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title, message, target_role: role })
                    });
                    if (res.ok) {
                        showToast('Announcement broadcasted successfully!', 'success');
                        formBroadcast.reset();
                    }
                } catch (err) {
                    console.error(err);
                }
            } else {
                showToast('Announcements broadcast simulated!', 'success');
                formBroadcast.reset();
            }
        });
    }
}

async function loadAdminAnalytics() {
    if (isLiveMode) {
        try {
            const res = await fetch(`${BACKEND_URL}/admin/analytics`);
            if (res.ok) {
                const data = await res.json();
                document.getElementById('admin-kpi-artisans').textContent = data.artisans_count;
                document.getElementById('admin-kpi-products').textContent = data.products_count;
                document.getElementById('admin-kpi-inquiries').textContent = data.inquiries_count;
                document.getElementById('admin-kpi-sales').textContent = `₹ ${data.estimated_sales_value.toLocaleString()}`;
            }

            // Category chart calculations
            const prodRes = await fetch(`${BACKEND_URL}/products`);
            if (prodRes.ok) {
                const products = await prodRes.json();
                
                // Count category occurrences
                const counts = { Textiles: 0, Pottery: 0, Handicrafts: 0, Jewelry: 0, "Paintings & Art": 0 };
                products.forEach(p => {
                    if (counts[p.category] !== undefined) counts[p.category]++;
                });

                const chartContainer = document.getElementById('admin-analytics-chart');
                chartContainer.innerHTML = '';
                
                const maxVal = Math.max(...Object.values(counts)) || 1;

                Object.entries(counts).forEach(([cat, val]) => {
                    const row = document.createElement('div');
                    row.className = 'chart-bar-row';
                    const percentage = (val / maxVal) * 100;
                    row.innerHTML = `
                        <div class="chart-label">${cat}</div>
                        <div class="chart-bar-outer">
                            <div class="chart-bar-inner" style="width: ${percentage}%;"></div>
                        </div>
                        <div class="chart-value">${val} Items</div>
                    `;
                    chartContainer.appendChild(row);
                });
            }
        } catch (e) {
            console.error(e);
        }
    } else {
        // Mock Admin KPIs
        document.getElementById('admin-kpi-artisans').textContent = '145';
        document.getElementById('admin-kpi-products').textContent = '620';
        document.getElementById('admin-kpi-inquiries').textContent = '28';
        document.getElementById('admin-kpi-sales').textContent = '₹ 4.2 Cr';

        // Mock Chart
        const chartContainer = document.getElementById('admin-analytics-chart');
        chartContainer.innerHTML = `
            <div class="chart-bar-row">
                <div class="chart-label">Textiles</div>
                <div class="chart-bar-outer"><div class="chart-bar-inner" style="width: 80%;"></div></div>
                <div class="chart-value">120 Items</div>
            </div>
            <div class="chart-bar-row">
                <div class="chart-label">Pottery</div>
                <div class="chart-bar-outer"><div class="chart-bar-inner" style="width: 50%;"></div></div>
                <div class="chart-value">60 Items</div>
            </div>
        `;
    }
}

async function loadAdminVerificationPipeline() {
    const list = document.getElementById('admin-verification-list');
    list.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading verification records...</td></tr>';

    if (isLiveMode) {
        try {
            const res = await fetch(`${BACKEND_URL}/admin/users`);
            if (res.ok) {
                const users = await res.json();
                list.innerHTML = '';
                
                const artisans = users.filter(u => u.role === 'Artisan');
                if (artisans.length === 0) {
                    list.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No pending verifications.</td></tr>';
                } else {
                    artisans.forEach(u => {
                        const tr = document.createElement('tr');
                        const statusClass = u.is_verified ? 'btn-danger-sm' : 'btn-success-sm';
                        const actionText = u.is_verified ? 'Revoke Verification' : 'Verify Aadhaar';
                        tr.innerHTML = `
                            <td>#00${u.id}</td>
                            <td style="font-weight:600; color:var(--text-primary);">${u.username}</td>
                            <td>${u.region || 'Varanasi'}</td>
                            <td>${u.preferred_lang}</td>
                            <td style="color:${u.is_verified ? 'var(--success)' : 'var(--text-muted)'}; font-weight:600;">
                                ${u.is_verified ? '✓ Approved' : '⏳ Pending Approval'}
                            </td>
                            <td>
                                <button class="btn-action-sm ${statusClass}" onclick="toggleUserVerification(${u.id}, ${!u.is_verified})">
                                    ${actionText}
                                </button>
                            </td>
                        `;
                        list.appendChild(tr);
                    });
                }
            }
        } catch (e) {
            console.error(e);
        }
    } else {
        list.innerHTML = `
            <tr>
                <td>#002</td>
                <td style="font-weight:600; color:var(--text-primary);">Ramesh Kumar</td>
                <td>Jaipur</td>
                <td>Hindi</td>
                <td>⏳ Pending Approval</td>
                <td><button class="btn-action-sm btn-success-sm" onclick="showToast('Verification toggled')">Verify Aadhaar</button></td>
            </tr>
        `;
    }
}

// Global user verification trigger
window.toggleUserVerification = async function(userId, verify) {
    if (!isLiveMode) return;
    try {
        const formData = new FormData();
        formData.append('verify', verify);
        const res = await fetch(`${BACKEND_URL}/admin/verify-artisan/${userId}`, {
            method: 'POST',
            body: formData
        });
        if (res.ok) {
            showToast('Artisan verification state updated', 'success');
            loadAdminVerificationPipeline();
            loadAdminAnalytics();
        }
    } catch (e) {
        showToast('Error verifying artisan', 'error');
    }
};

// 7. Accessible Multilingual Portal Translations UI
const translations = {
    English: {
        title: "Empowering Rural Artisans with Generative AI",
        subtitle: "Bridge the gap between traditional craftsmanship and global e-commerce. Convert raw mobile photos and regional voice notes into studio-quality ONDC-ready catalogs in seconds.",
        navFeatures: "Features",
        navStudio: "Artisan Studio",
        navMarketplace: "B2B Showcase",
        btnSimulator: "Try Simulator",
        login: "Login",
        logout: "Logout",
        selectRole: "All Portal (Public)"
    },
    Hindi: {
        title: "ग्रामीण कारीगरों को जेनेरेटिव एआई के साथ सशक्त बनाना",
        subtitle: "पारंपरिक शिल्प कौशल और वैश्विक ई-कॉमर्स के बीच की खाई को पाटें। कच्चे मोबाइल फ़ोटो और क्षेत्रीय वॉयस नोट्स को सेकंडों में स्टूडियो-गुणवत्ता वाले ONDC-रेडी कैटलॉग में बदलें।",
        navFeatures: "विशेषताएं",
        navStudio: "कारीगर स्टूडियो",
        navMarketplace: "बी2बी शोरूम",
        btnSimulator: "सिम्युलेटर आज़माएं",
        login: "लॉगिन",
        logout: "लॉगआउट",
        selectRole: "सार्वजनिक पोर्टल"
    }
};

let currentLanguage = 'English';

function setupLanguageToggle() {
    const btn = document.getElementById('btn-lang-toggle');
    
    btn.addEventListener('click', () => {
        currentLanguage = currentLanguage === 'English' ? 'Hindi' : 'English';
        btn.textContent = currentLanguage === 'English' ? 'English' : 'हिंदी';
        
        // Translate static header labels
        const dict = translations[currentLanguage];
        document.querySelector('.hero h1').innerHTML = dict.title.replace('Generative AI', '<span class="gradient-text">Generative AI</span>');
        document.querySelector('.hero-subtitle').textContent = dict.subtitle;
        
        const navLinks = document.querySelectorAll('.nav-lnk-item');
        if (navLinks.length >= 3) {
            navLinks[0].textContent = dict.navFeatures;
            navLinks[1].textContent = dict.navStudio;
            navLinks[2].textContent = dict.navMarketplace;
        }

        const roleOptions = document.getElementById('role-select').options;
        roleOptions[0].text = dict.selectRole;
        
        showToast(currentLanguage === 'English' ? 'Language switched to English' : 'भाषा हिंदी में बदली गई', 'info');
    });
}

let isVoiceAssistantEnabled = false;

function setupVoiceOnboarding() {
    const btnAudioGuide = document.getElementById('btn-audio-guide');
    if (!btnAudioGuide) return;

    const speak = (text) => {
        if (!isVoiceAssistantEnabled) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Find language voice
        const isHindi = currentLanguage === 'Hindi';
        const voice = window.speechSynthesis.getVoices().find(v => 
            isHindi ? (v.lang.includes('hi') || v.lang.includes('IN')) : v.lang.includes('en')
        );
        if (voice) {
            utterance.voice = voice;
        }
        utterance.lang = isHindi ? 'hi-IN' : 'en-US';
        window.speechSynthesis.speak(utterance);
    };

    btnAudioGuide.addEventListener('click', () => {
        isVoiceAssistantEnabled = !isVoiceAssistantEnabled;
        if (isVoiceAssistantEnabled) {
            btnAudioGuide.textContent = currentLanguage === 'English' ? '🔊 Voice Assistant: On' : '🔊 वॉयस असिस्टेंट: चालू';
            btnAudioGuide.style.borderColor = 'var(--primary)';
            btnAudioGuide.style.color = 'var(--primary)';
            const greeting = currentLanguage === 'English' 
                ? "Voice assistant is active. Hover over or click any input field for voice guidance." 
                : "वॉयस असिस्टेंट चालू है। कर्सर को किसी भी इनपुट फ़ील्ड पर ले जाएं या टैप करें।";
            speak(greeting);
        } else {
            btnAudioGuide.textContent = currentLanguage === 'English' ? '🔊 Voice Assistant: Off' : '🔊 वॉयस असिस्टेंट: बंद';
            btnAudioGuide.style.borderColor = 'var(--border-color)';
            btnAudioGuide.style.color = 'var(--text-secondary)';
            window.speechSynthesis.cancel();
        }
    });

    // Add audio guide hooks to fields
    const fields = [
        { id: 'register-username', en: "Please enter a unique username for your account.", hi: "कृपया अपने खाते के लिए एक अनोखा यूज़रनेम दर्ज करें।" },
        { id: 'register-password', en: "Enter a secure password of at least eight characters.", hi: "कम से कम आठ अंकों का एक सुरक्षित पासवर्ड टाइप करें।" },
        { id: 'register-role', en: "Choose your portal role: Artisan, Buyer, or Aggregator.", hi: "अपनी भूमिका चुनें: जैसे कि कारीगर, खरीदार, या संघ संचालक।" },
        { id: 'register-lang', en: "Select your preferred language for the dashboard display.", hi: "डैशबोर्ड डिस्प्ले के लिए अपनी पसंदीदा भाषा चुनें।" },
        { id: 'register-region', en: "Type your city or region name, for example: Varanasi, Uttar Pradesh.", hi: "अपने शहर या राज्य का नाम लिखें, उदाहरण के लिए: वाराणसी, उत्तर प्रदेश।" },
        { id: 'register-craft', en: "Type your craft style, for example: Banarasi Silk Textiles or Terracotta Clay Pottery.", hi: "अपने शिल्प का प्रकार लिखें, उदाहरण के लिए: बनारसी सिल्क कपड़ा या टेराकोटा मिट्टी के बर्तन।" },
        { id: 'register-aadhaar', en: "Please type your twelve-digit Aadhaar number for identity verification.", hi: "कृपया पहचान सत्यापन के लिए अपना बारह-अंकों का आधार नंबर दर्ज करें।" },
        { id: 'login-username', en: "Type your username to sign in.", hi: "लॉगिन करने के लिए अपना यूज़रनेम टाइप करें।" },
        { id: 'login-password', en: "Type your account password to sign in.", hi: "लॉगिन करने के लिए अपने खाते का पासवर्ड टाइप करें।" },
        { id: 'btn-auth-trigger', en: "Click this button to open the login or register window.", hi: "लॉगिन या रजिस्ट्रेशन विंडो खोलने के लिए इस बटन पर क्लिक करें।" },
        { id: 'role-select', en: "Switch dashboard portals: select Artisan, Buyer, Aggregator, or Admin views.", hi: "डैशबोर्ड पोर्टल बदलें: कारीगर, खरीदार, संघ संचालक, या व्यवस्थापक दृष्टिकोण चुनें।" }
    ];

    fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (el) {
            const handleFocus = () => {
                const text = currentLanguage === 'English' ? f.en : f.hi;
                speak(text);
            };
            el.addEventListener('focus', handleFocus);
            el.addEventListener('mouseenter', handleFocus);
        }
    });
}

