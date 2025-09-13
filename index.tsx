/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Type Definitions ---
type LifestyleFactors = {
    smoking: number;
    sunExposure: number;
    stress: number;
};

type UploadedImage = {
    base64: string;
    mimeType: string;
    fileName: string;
    objectURL: string;
};

type ResultCard = {
    year: number;
    status: 'loading' | 'success' | 'error';
    imageUrl?: string;
};

// --- State ---
let uploadedImage: UploadedImage | null = null;
let lifestyleFactors: LifestyleFactors = { smoking: 0, sunExposure: 2, stress: 3 };
let isLoading = false;
let results: ResultCard[] = [];
let errorMessage: string | null = null;
let loadingInterval: number | undefined;

// --- DOM Elements (will be populated by the buildUI function) ---
let dropZone: HTMLElement, imageUploadInput: HTMLInputElement, imagePreviewContainer: HTMLElement,
    imagePreview: HTMLImageElement, controlsSection: HTMLElement, resultsSection: HTMLElement,
    timelineContainer: HTMLElement, loadingSpinner: HTMLElement, loadingTextElement: HTMLElement,
    generateButton: HTMLButtonElement, errorMessageContainer: HTMLElement, appContainer: HTMLElement;
const sliders: { [key in keyof LifestyleFactors]?: HTMLInputElement } = {};

const loadingMessages = [
    "Crafting your radiant future…", "Polishing the timeline…", "Summoning the best version of you…",
    "Waving the magic of time…", "Infusing youth into tomorrow…", "Aligning the stars for your glow…",
    "Mapping your elegant future…", "Gently aging with style…", "Projecting your timeline brilliance…",
    "Preparing your sparkling self…"
];

// --- Styling (CSS-in-TS) ---
const applyStyles = (element: HTMLElement, styles: Partial<CSSStyleDeclaration>) => {
    for (const key in styles) {
        (element.style as any)[key] = styles[key];
    }
};

const commonStyles = {
    sectionTransition: {
        opacity: '0',
        transform: 'translateY(20px)',
        transition: 'opacity 0.6s ease-out, transform 0.6s ease-out, max-height 0.8s ease, margin 0.6s ease',
        maxHeight: '0',
        overflow: 'hidden',
        marginTop: '0',
    },
    sectionActive: {
        opacity: '1',
        transform: 'translateY(0)',
        maxHeight: '1000px',
        overflow: 'visible',
    }
};

const getStyles = (isMobile: boolean) => ({
    appContainer: {
        width: '100%', maxWidth: '1000px', backgroundColor: 'rgba(20, 20, 20, 0.5)',
        borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), inset 0 0 1px 1px rgba(255, 255, 255, 0.03)',
        padding: isMobile ? '1.5rem' : '3rem', boxSizing: 'border-box', border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(30px)',
    },
    header: {
        textAlign: 'center', marginBottom: '3rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '2rem',
    },
    h1: {
        fontSize: isMobile ? '2.5rem' : '3.5rem', fontWeight: '700', background: 'linear-gradient(90deg, #c9a47e, #e6d3b3)',
        webkitBackgroundClip: 'text', webkitTextFillColor: 'transparent', margin: '0', letterSpacing: '-0.05em',
    },
    headerP: {
        fontSize: isMobile ? '1rem' : '1.1rem', color: '#8a8a8a', marginTop: '0.75rem',
        maxWidth: '55ch', marginLeft: 'auto', marginRight: 'auto', lineHeight: '1.6',
    },
    main: { display: 'flex', flexDirection: 'column', gap: '3rem' },
    dropZone: {
        textAlign: 'center', cursor: 'pointer', padding: '3rem', position: 'relative',
        borderRadius: '16px', overflow: 'hidden', transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        backgroundColor: 'rgba(0,0,0,0.1)', border: '1px dashed rgba(255, 255, 255, 0.08)',
    },
    uploadLink: { color: '#c9a47e', fontWeight: '600', textDecoration: 'none' },
    imagePreviewContainer: { textAlign: 'center' },
    imagePreview: {
        maxWidth: '100%', maxHeight: '350px', borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
    },
    h2: {
        textAlign: 'center', color: '#e6e6e6', marginBottom: '2rem',
        fontWeight: '600', letterSpacing: '-0.02em',
    },
    sliderGroup: {
        marginBottom: '1.5rem', display: 'grid', alignItems: 'center', gap: isMobile ? '0.75rem' : '1.5rem',
        gridTemplateColumns: isMobile ? '1fr' : '140px 1fr', textAlign: isMobile ? 'center' : 'left',
    },
    sliderLabel: {
        fontWeight: '500', color: '#8a8a8a', display: 'flex', gap: '0.5rem',
        alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start',
    },
    rangeInput: {
        webkitAppearance: 'none', appearance: 'none', width: '100%', height: '4px',
        background: '#1a1a1a', borderRadius: '2px', outline: 'none', cursor: 'pointer',
        border: '1px solid rgba(255, 255, 255, 0.08)',
    },
    actionButton: {
        background: '#c9a47e', color: '#0a0a0a', padding: '16px 32px', borderRadius: '12px',
        fontSize: '1.1rem', fontWeight: '600', cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
        border: 'none', display: 'block', width: '100%', marginTop: '2.5rem',
    },
    timelineContainer: {
        display: 'flex', gap: '1.5rem', overflowX: 'auto', padding: '1rem 0.5rem',
        scrollSnapType: 'x mandatory', scrollbarWidth: 'thin',
        scrollbarColor: '#1a1a1a transparent',
    },
    footer: {
        textAlign: 'center', marginTop: '3rem', paddingTop: '2rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)', color: '#8a8a8a',
        fontSize: '0.9rem',
    },
    errorMessage: {
        ...commonStyles.sectionTransition, color: '#ff8f8f', backgroundColor: 'rgba(255, 77, 77, 0.05)',
        border: '1px solid rgba(255, 77, 77, 0.3)', padding: '1rem 1.5rem', borderRadius: '12px',
        textAlign: 'center', fontWeight: '500',
    },
});

// --- UI Builder ---
function buildUI() {
    const root = document.getElementById('app-root')!;
    root.innerHTML = ''; // Clear previous UI

    const isMobile = window.innerWidth <= 768;
    const styles = getStyles(isMobile);

    appContainer = document.createElement('div');
    appContainer.id = 'app-container';
    applyStyles(appContainer, styles.appContainer);

    // Header
    const header = document.createElement('header');
    applyStyles(header, styles.header);
    const h1 = document.createElement('h1');
    h1.textContent = 'TimeMirror';
    applyStyles(h1, styles.h1);
    const p = document.createElement('p');
    p.textContent = 'Peer into your future. Upload a portrait and allow our advanced temporal projection AI to reveal a glimpse of the years to come.';
    applyStyles(p, styles.headerP);
    header.append(h1, p);

    // Main
    const main = document.createElement('main');
    applyStyles(main, styles.main);

    // Upload Section
    const uploadSection = document.createElement('div');
    uploadSection.id = 'upload-section';
    
    dropZone = document.createElement('div');
    dropZone.id = 'drop-zone';
    applyStyles(dropZone, styles.dropZone);
    dropZone.innerHTML = `...`; // Content set later for simplicity
    
    imageUploadInput = document.createElement('input');
    imageUploadInput.type = 'file';
    imageUploadInput.id = 'image-upload';
    imageUploadInput.accept = 'image/*';
    imageUploadInput.hidden = true;
    
    imagePreviewContainer = document.createElement('div');
    imagePreviewContainer.id = 'image-preview-container';
    imagePreviewContainer.className = 'hidden';
    applyStyles(imagePreviewContainer, styles.imagePreviewContainer);
    imagePreview = document.createElement('img');
    imagePreview.id = 'image-preview';
    applyStyles(imagePreview, styles.imagePreview);
    imagePreviewContainer.appendChild(imagePreview);
    
    uploadSection.append(dropZone, imageUploadInput, imagePreviewContainer);

    // Controls Section
    controlsSection = document.createElement('div');
    controlsSection.id = 'controls-section';
    applyStyles(controlsSection, commonStyles.sectionTransition);
    
    generateButton = document.createElement('button');
    generateButton.id = 'generate-button';
    generateButton.className = 'action-button';
    applyStyles(generateButton, styles.actionButton);
    generateButton.textContent = 'Envision My Future';
    
    // Results Section
    resultsSection = document.createElement('div');
    resultsSection.id = 'results-section';
    applyStyles(resultsSection, commonStyles.sectionTransition);

    loadingSpinner = document.createElement('div');
    loadingSpinner.id = 'loading-spinner';
    loadingSpinner.className = 'hidden';
    loadingTextElement = document.createElement('p');
    loadingTextElement.id = 'loading-text';
    timelineContainer = document.createElement('div');
    timelineContainer.id = 'timeline-container';
    applyStyles(timelineContainer, styles.timelineContainer);
    
    // Error Message
    errorMessageContainer = document.createElement('div');
    errorMessageContainer.id = 'error-message';
    applyStyles(errorMessageContainer, styles.errorMessage);

    // Footer
    const footer = document.createElement('footer');
    applyStyles(footer, styles.footer);
    footer.innerHTML = `<p><strong>Privacy Commitment:</strong> Your images are processed in memory and are never stored on our servers.</p>`;
    
    // Assemble everything
    main.append(uploadSection, controlsSection, resultsSection, errorMessageContainer);
    appContainer.append(header, main, footer);
    root.appendChild(appContainer);

    // Populate complex innerHTML and create dynamic elements
    populateAndCreateDynamicElements(styles);
}

function populateAndCreateDynamicElements(styles: ReturnType<typeof getStyles>) {
    // Drop Zone Content
    dropZone.innerHTML = `
        <div class="drop-zone-prompt" style="color: #8a8a8a;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 1rem;">
                <path d="M12 16.5V3M12 3L16 7.375M12 3L8 7.375M21 12.5V19.8C21 20.1313 20.8682 20.4493 20.6364 20.6811C20.4045 20.9129 20.0866 21.0447 19.755 21.0447H4.245C3.91341 21.0447 3.59551 20.9129 3.36364 20.6811C3.13177 20.4493 3 20.1313 3 19.8V12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <p>Drag and drop your photograph, or <span class="upload-link" style="color:${styles.uploadLink.color}; font-weight:${styles.uploadLink.fontWeight};">browse files</span></p>
        </div>`;

    // Controls Section Content
    const controlsH2 = document.createElement('h2');
    controlsH2.textContent = 'Adjust Lifestyle Factors';
    applyStyles(controlsH2, styles.h2);
    controlsSection.appendChild(controlsH2);

    const sliderData = [
        { id: 'smoking', label: 'Smoking', tooltip: 'Simulates the effect of long-term smoking on skin health and aging.', value: 0 },
        { id: 'sunExposure', label: 'Sun Exposure', tooltip: 'Models the impact of cumulative sun exposure, from minimal to heavy.', value: 2 },
        { id: 'stress', label: 'Stress', tooltip: 'Reflects how high or low stress levels can influence signs of aging.', value: 3 }
    ];

    sliderData.forEach(data => {
        const group = document.createElement('div');
        applyStyles(group, styles.sliderGroup);
        group.innerHTML = `
            <label for="${data.id}-slider" style="${Object.entries(styles.sliderLabel).map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}:${v}`).join(';')}">
                ${data.label}
                <span style="position: relative; width: 18px; height: 18px; border-radius: 50%; background-color: #1a1a1a; color: #8a8a8a; font-size: 12px; cursor: help; border: 1px solid rgba(255, 255, 255, 0.08); display: inline-flex; align-items: center; justify-content: center;">?
                    <span style="visibility: hidden; opacity: 0; width: 220px; background-color: #161b22; color: #e6e6e6; text-align: center; border-radius: 8px; padding: 10px; position: absolute; z-index: 10; bottom: 135%; left: 50%; margin-left: -110px; transition: opacity 0.3s ease, transform 0.3s ease; transform: translateY(10px); font-size: 0.85rem; font-weight: 400; box-shadow: 0 8px 16px rgba(0,0,0,0.3); border: 1px solid rgba(255, 255, 255, 0.08);">
                        ${data.tooltip}
                    </span>
                </span>
            </label>`;
        const input = document.createElement('input');
        input.type = 'range';
        input.id = `${data.id}-slider`;
        input.min = '0';
        input.max = '10';
        input.value = String(data.value);
        applyStyles(input, styles.rangeInput);
        group.appendChild(input);
        controlsSection.appendChild(group);
        sliders[data.id as keyof LifestyleFactors] = input;

        const tooltipIcon = group.querySelector('span[style*="position: relative"]');
        const tooltipText = group.querySelector('span[style*="visibility: hidden"]');
        if (tooltipIcon && tooltipText) {
            tooltipIcon.addEventListener('mouseenter', () => (tooltipText as HTMLElement).style.visibility = 'visible');
            tooltipIcon.addEventListener('mouseleave', () => (tooltipText as HTMLElement).style.visibility = 'hidden');
        }
    });
    controlsSection.appendChild(generateButton);


    // Results Section Content
    const resultsH2 = document.createElement('h2');
    resultsH2.textContent = 'Your Journey Through Time Awaits';
    applyStyles(resultsH2, styles.h2);

    loadingSpinner.style.textAlign = 'center';
    loadingSpinner.style.padding = '40px 0';
    loadingSpinner.innerHTML = `
        <div class="clock-loader" style="position: relative; width: 64px; height: 64px; display: inline-block; margin-bottom: 1rem; border: 2px solid rgba(255, 255, 255, 0.08); border-radius: 50%; box-shadow: inset 0 0 10px rgba(0,0,0,0.2);">
            <div style="content: ''; position: absolute; background-color: #c9a47e; top: 50%; left: 50%; width: 6px; height: 6px; margin-left: -3px; margin-top: -3px; border-radius: 50%; z-index: 10;"></div>
            <div style="position: absolute; bottom: 50%; left: 50%; transform-origin: bottom center; border-radius: 2px; width: 4px; height: 20px; margin-left: -2px; background-color: #e6e6e6; animation: clock-spin 12s linear infinite;"></div>
            <div style="position: absolute; bottom: 50%; left: 50%; transform-origin: bottom center; border-radius: 2px; width: 2px; height: 28px; margin-left: -1px; background-color: #c9a47e; animation: clock-spin 1s linear infinite;"></div>
        </div>
    `;
    loadingSpinner.appendChild(loadingTextElement);
    resultsSection.append(resultsH2, loadingSpinner, timelineContainer);
}


// --- UI Rendering ---
function updateUI() {
    // Image upload view
    if (uploadedImage) {
        dropZone.classList.add('hidden');
        imagePreviewContainer.classList.remove('hidden');
        imagePreview.src = uploadedImage.objectURL;
        applyStyles(controlsSection, commonStyles.sectionActive);
    } else {
        dropZone.classList.remove('hidden');
        imagePreviewContainer.classList.add('hidden');
        applyStyles(controlsSection, commonStyles.sectionTransition);
    }

    // Loading state
    if (isLoading) {
        generateButton.disabled = true;
        generateButton.textContent = 'Envisioning...';
        loadingSpinner.classList.remove('hidden');
    } else {
        generateButton.disabled = false;
        generateButton.textContent = 'Envision My Future';
        loadingSpinner.classList.add('hidden');
    }

    // Results section visibility
    if (isLoading || results.length > 0) {
        applyStyles(resultsSection, commonStyles.sectionActive);
    } else {
        applyStyles(resultsSection, commonStyles.sectionTransition);
    }

    // Error message
    if (errorMessage) {
        errorMessageContainer.textContent = errorMessage;
        applyStyles(errorMessageContainer, commonStyles.sectionActive);
    } else {
        errorMessageContainer.textContent = '';
        applyStyles(errorMessageContainer, commonStyles.sectionTransition);
    }

    // Timeline items
    timelineContainer.innerHTML = results.map(result => {
        switch (result.status) {
            case 'loading':
                return `
                    <div style="text-align: center; border-radius: 18px; flex: 0 0 220px; scroll-snap-align: center; position: relative; border: 1px solid rgba(255, 255, 255, 0.08); background: #1a1a1a; overflow: hidden;">
                        <div style="padding: 1rem; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                            <div style="width: 80%; height: 6px; background-color: rgba(0,0,0,0.2); border-radius: 3px; overflow: hidden; position: relative; margin-bottom: 1rem; border: 1px solid rgba(255, 255, 255, 0.08);">
                                <div style="position: absolute; top: 0; left: 0; height: 100%; width: 150%; background: linear-gradient(90deg, #c9a47e, #e6d3b3); opacity: 0.4; animation: shimmer 2s infinite linear;"></div>
                            </div>
                            <p style="font-size: 1.5rem; font-weight: 700; color: #8a8a8a; margin: 0;">${result.year}</p>
                        </div>
                    </div>`;
            case 'success':
                return `
                    <div class="timeline-item" style="text-align: center; border-radius: 18px; transition: transform 0.3s ease, box-shadow 0.3s ease; flex: 0 0 220px; scroll-snap-align: center; position: relative; border: 1px solid rgba(255, 255, 255, 0.08); background: #1a1a1a; overflow: hidden;">
                        <div style="padding: 1rem; height: 100%; box-sizing: border-box; display: flex; flex-direction: column;">
                            <img src="${result.imageUrl}" alt="You in ${result.year}" style="width: 100%; height: 220px; object-fit: cover; border-radius: 12px; margin-bottom: 1rem; opacity: 1; transition: opacity 0.6s ease-in-out;" loading="lazy" />
                            <p style="font-size: 1.5rem; font-weight: 700; color: #e6e6e6; margin: 0 0 1rem 0;">${result.year}</p>
                            <a href="${result.imageUrl}" download="${uploadedImage?.fileName}_${result.year}.png" class="download-link" style="background-color: rgba(255,255,255,0.05); color: #8a8a8a; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.9rem; transition: all 0.2s ease; margin-top: auto; border: 1px solid rgba(255, 255, 255, 0.08); cursor: pointer;">Download</a>
                        </div>
                    </div>`;
            case 'error':
                 return `
                    <div style="text-align: center; border-radius: 18px; flex: 0 0 220px; scroll-snap-align: center; position: relative; border: 1px solid rgba(255, 77, 77, 0.3); background: #1a1a1a; overflow: hidden;">
                        <div style="padding: 1rem; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #ff8f8f;">
                             <p style="font-weight: 600; font-size: 1.2rem; margin-bottom: 0.5rem; animation: fade-in 0.5s ease;">Failed</p>
                            <p style="font-size: 1.5rem; font-weight: 700;">${result.year}</p>
                        </div>
                    </div>`;
            default: return '';
        }
    }).join('');
    addTimelineItemHoverEffects();
}

// --- Event Handlers & Logic ---

function handleFile(file: File) {
    const fileName = file.name.split('.').slice(0, -1).join('.');
    const mimeType = file.type;
    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target?.result as string;
        if (uploadedImage?.objectURL) URL.revokeObjectURL(uploadedImage.objectURL);
        uploadedImage = {
            base64: result.split(',')[1], mimeType, fileName,
            objectURL: URL.createObjectURL(file),
        };
        results = [];
        errorMessage = null;
        updateUI();
    };
    reader.readAsDataURL(file);
}

function startLoadingTextAnimation() {
    let messageIndex = 0;
    loadingTextElement.textContent = loadingMessages[messageIndex];
    loadingInterval = window.setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        loadingTextElement.textContent = loadingMessages[messageIndex];
    }, 2000);
}

function stopLoadingTextAnimation() {
    clearInterval(loadingInterval);
}

const createPrompt = (year: number, factors: LifestyleFactors): string => {
    const parts: string[] = [];
    if (factors.smoking > 5) parts.push("a history of smoking");
    if (factors.sunExposure > 5) parts.push("significant sun exposure");
    if (factors.stress > 5) parts.push("high levels of stress");
    const factorsText = parts.length === 0 ? "a healthy lifestyle" : parts.join(", ");

    return `Generate a single photorealistic image predicting how the person in the photo will look in the year ${year}.
- Key Instructions:
- Preserve core identity: The bone structure, eye color, and key facial landmarks must be maintained.
- Realistic, subtle aging: Apply gentle, age-appropriate wrinkles and a few hints of grey hair. The skin should still look radiant and youthful for their age. The eyes should remain sparkling and energetic.
- Background: Keep the background consistent with the original photo.
- Lifestyle influence: The person has had ${factorsText}, which should subtly affect wrinkle intensity.
- Output format: High-resolution PNG.
- Safety: Ensure the output is positive and respectful.`;
};

const generateSingleImage = async (prompt: string, image: UploadedImage): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    { inlineData: { data: image.base64, mimeType: image.mimeType } },
                    { text: prompt },
                ],
            },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) return part.inlineData.data;
        }
        return null;
    } catch (error) {
        console.error(`Error generating image for prompt "${prompt}":`, error);
        throw error;
    }
};

async function handleGenerate() {
    if (!uploadedImage) {
        errorMessage = 'Please upload an image first.';
        updateUI();
        return;
    }

    isLoading = true;
    errorMessage = null;
    const years = [2030, 2040, 2050, 2060, 2070];
    results = years.map(year => ({ year, status: 'loading' }));
    startLoadingTextAnimation();
    updateUI();

    try {
        const processingPromises = years.map(async (year) => {
            try {
                const prompt = createPrompt(year, lifestyleFactors);
                const base64Image = await generateSingleImage(prompt, uploadedImage!);
                const resultIndex = results.findIndex(r => r.year === year);
                if (resultIndex !== -1) {
                    results[resultIndex] = base64Image
                        ? { ...results[resultIndex], status: 'success', imageUrl: `data:image/png;base64,${base64Image}` }
                        : { ...results[resultIndex], status: 'error' };
                    updateUI();
                }
            } catch (error) {
                console.error(`Error generating image for ${year}:`, error);
                const resultIndex = results.findIndex(r => r.year === year);
                if (resultIndex !== -1) {
                    results[resultIndex] = { ...results[resultIndex], status: 'error' };
                    updateUI();
                }
            }
        });
        await Promise.all(processingPromises);
    } catch (error) {
        console.error("General error during image generation:", error);
        errorMessage = 'An unexpected error occurred. Please try again.';
    } finally {
        isLoading = false;
        stopLoadingTextAnimation();
        updateUI();
    }
}

// --- Dynamic Event Listeners & Effects ---
function addTimelineItemHoverEffects() {
    document.querySelectorAll('.timeline-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
            const el = item as HTMLElement;
            el.style.transform = 'translateY(-10px) scale(1.05)';
            el.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.4)';
            el.style.borderColor = 'rgba(201, 164, 126, 0.5)';
        });
        item.addEventListener('mouseleave', () => {
            const el = item as HTMLElement;
            el.style.transform = '';
            el.style.boxShadow = '';
            el.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        });
    });
     document.querySelectorAll('.download-link').forEach(item => {
        item.addEventListener('mouseenter', () => {
            const el = item as HTMLElement;
            el.style.backgroundColor = '#c9a47e';
            el.style.color = '#0a0a0a';
            el.style.borderColor = '#c9a47e';
            el.style.transform = 'scale(1.05)';
        });
        item.addEventListener('mouseleave', () => {
            const el = item as HTMLElement;
            el.style.backgroundColor = 'rgba(255,255,255,0.05)';
            el.style.color = '#8a8a8a';
            el.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            el.style.transform = '';
        });
    });
}

function addHoverEffects() {
    dropZone.addEventListener('mouseenter', () => {
        dropZone.style.borderColor = 'rgba(201, 164, 126, 0.5)';
        dropZone.style.transform = 'scale(1.02)';
        dropZone.style.boxShadow = '0 0 30px rgba(201, 164, 126, 0.1)';
    });
    dropZone.addEventListener('mouseleave', () => {
        dropZone.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        dropZone.style.transform = '';
        dropZone.style.boxShadow = '';
    });

    generateButton.addEventListener('mouseenter', () => {
        if (generateButton.disabled) return;
        generateButton.style.transform = 'translateY(-3px)';
        generateButton.style.backgroundColor = '#e6d3b3';
        generateButton.style.boxShadow = '0 10px 20px -5px rgba(201, 164, 126, 0.2)';
    });
    generateButton.addEventListener('mouseleave', () => {
        if (generateButton.disabled) return;
        generateButton.style.transform = '';
        generateButton.style.backgroundColor = '#c9a47e';
        generateButton.style.boxShadow = '';
    });

    Object.values(sliders).forEach(slider => {
        if (!slider) return;
        // JS alternative for ::-webkit-slider-thumb:hover is complex, this part is better in CSS.
        // For this refactor, we accept this minor loss of a hover effect to adhere to the prompt.
    });
}

// --- Initializer ---
function init() {
    buildUI();
    addHoverEffects();

    dropZone.addEventListener('click', () => imageUploadInput.click());
    imageUploadInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) handleFile(file);
    });

    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'rgba(201, 164, 126, 0.5)'; });
    dropZone.addEventListener('dragleave', (e) => { dropZone.style.borderColor = 'rgba(255, 255, 255, 0.08)'; });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) handleFile(files[0]);
    });

    generateButton.addEventListener('click', handleGenerate);

    (Object.keys(sliders) as Array<keyof LifestyleFactors>).forEach(key => {
        sliders[key]!.addEventListener('input', (e) => {
            lifestyleFactors[key] = parseInt((e.target as HTMLInputElement).value, 10);
        });
    });

    window.addEventListener('resize', () => {
        // A simple re-render on resize to apply responsive styles
        const currentImage = uploadedImage;
        const currentResults = results;
        buildUI();
        addHoverEffects();
        uploadedImage = currentImage; // Restore state
        results = currentResults;
        updateUI(); // Re-render with current state
    });

    updateUI();
}

init();
