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

// --- Utility Functions ---
function getElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Fatal Error: Element with id "${id}" not found.`);
    }
    return element as T;
}

function applyStyles(element: HTMLElement, styles: Partial<CSSStyleDeclaration>) {
    for (const property in styles) {
        (element.style as any)[property] = styles[property as keyof typeof styles];
    }
}

// --- Style Definitions (CSS-in-TS) ---
const timelineItemStyle: Partial<CSSStyleDeclaration> = {
    textAlign: 'center',
    borderRadius: '18px',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    flex: '0 0 200px',
    scrollSnapAlign: 'center',
    position: 'relative',
    padding: '2px',
    background: 'transparent',
    zIndex: '1',
};
const timelineItemHoverStyle: Partial<CSSStyleDeclaration> = {
    transform: 'translateY(-10px) scale(1.05)',
    boxShadow: '0 15px 30px rgba(0, 0, 0, 0.4)',
};

const timelineItemPseudoBeforeStyle: Partial<CSSStyleDeclaration> = {
    content: "''",
    position: 'absolute',
    inset: '0',
    background: 'var(--border-color)',
    borderRadius: 'inherit',
    zIndex: '-1',
    transition: 'background 0.4s ease',
};
const timelineItemPseudoBeforeHoverStyle: Partial<CSSStyleDeclaration> = {
    background: 'var(--accent-gradient)',
};

const timelineItemContentStyle: Partial<CSSStyleDeclaration> = {
    background: '#161b22',
    padding: '1rem',
    borderRadius: '16px',
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
};

const imageStyle: Partial<CSSStyleDeclaration> = {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    borderRadius: '12px',
    marginBottom: '1rem',
};

const yearStyle: Partial<CSSStyleDeclaration> = {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '1rem',
};

const downloadLinkStyle: Partial<CSSStyleDeclaration> = {
    backgroundColor: 'var(--secondary-container)',
    color: 'var(--text-primary)',
    padding: '10px 18px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '0.9rem',
    display: 'inline-block',
    transition: 'background-color 0.2s ease, transform 0.2s ease, color 0.2s ease',
    marginTop: 'auto',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
};
const downloadLinkHoverStyle: Partial<CSSStyleDeclaration> = {
    backgroundColor: 'var(--accent-color-1)',
    color: '#fff',
    transform: 'scale(1.05)',
};

const loadingContentStyle: Partial<CSSStyleDeclaration> = {
    justifyContent: 'center',
    alignItems: 'center',
};

const loadingYearStyle: Partial<CSSStyleDeclaration> = {
    color: 'var(--text-secondary)',
};

const progressContainerStyle: Partial<CSSStyleDeclaration> = {
    width: '80%',
    height: '8px',
    backgroundColor: 'var(--secondary-container)',
    borderRadius: '4px',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: '1rem',
    border: '1px solid var(--border-color)',
};

const progressBarStyle: Partial<CSSStyleDeclaration> = {
    position: 'absolute',
    top: '0',
    left: '0',
    height: '100%',
    width: '150%',
    background: 'var(--accent-gradient)',
    opacity: '0.6',
    transform: 'translateX(-100%) skewX(-15deg)',
    animation: 'shimmer 2s infinite linear',
};

const errorContentStyle: Partial<CSSStyleDeclaration> = {
    justifyContent: 'center',
    alignItems: 'center',
    color: 'var(--error-text)',
};

const errorPseudoBeforeStyle: Partial<CSSStyleDeclaration> = {
    background: 'var(--error-border)',
};

const errorTextStyle: Partial<CSSStyleDeclaration> = {
    fontWeight: '600',
    fontSize: '1.2rem',
    marginBottom: '0.5rem',
};

// --- DOM Element Selection ---
const dropZone = getElement<HTMLDivElement>('drop-zone');
const imageUpload = getElement<HTMLInputElement>('image-upload');
const imagePreviewContainer = getElement<HTMLDivElement>('image-preview-container');
const imagePreview = getElement<HTMLImageElement>('image-preview');
const controlsSection = getElement<HTMLDivElement>('controls-section');
const resultsSection = getElement<HTMLDivElement>('results-section');
const timelineContainer = getElement<HTMLDivElement>('timeline-container');
const loadingSpinner = getElement<HTMLDivElement>('loading-spinner');
const loadingText = getElement<HTMLParagraphElement>('loading-text');
const generateButton = getElement<HTMLButtonElement>('generate-button');
const errorMessage = getElement<HTMLDivElement>('error-message');

// --- State Variables ---
let uploadedImageBase64: string | null = null;
let originalFileName = 'generated_image';
let originalMimeType = 'image/png';
let loadingInterval: number;

const loadingMessages = [
    "Crafting your radiant future…",
    "Polishing the timeline…",
    "Summoning the best version of you…",
    "Waving the magic of time…",
    "Infusing youth into tomorrow…",
    "Aligning the stars for your glow…",
    "Mapping your elegant future…",
    "Gently aging with style…",
    "Projecting your timeline brilliance…",
    "Preparing your sparkling self…"
];

// --- Event Listeners ---
dropZone.addEventListener('click', () => imageUpload.click());

dropZone.addEventListener('dragover', (event: DragEvent) => {
    event.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (event: DragEvent) => {
    event.preventDefault();
    dropZone.classList.remove('dragover');
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
        handleFile(files[0]);
    }
});

imageUpload.addEventListener('change', (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        handleFile(file);
    }
});

generateButton.addEventListener('click', () => {
    if (uploadedImageBase64) {
        generateFutureImages();
    } else {
        showError('Please upload an image first.');
    }
});

// --- Core Functions ---
function handleFile(file: File) {
    originalFileName = file.name.split('.').slice(0, -1).join('.');
    originalMimeType = file.type;
    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target?.result as string;
        imagePreview.src = result;
        uploadedImageBase64 = result.split(',')[1];
        
        dropZone.classList.add('hidden');
        imagePreviewContainer.classList.remove('hidden');
        controlsSection.classList.add('is-active');
        resultsSection.classList.remove('is-active');
        timelineContainer.innerHTML = '';
        errorMessage.classList.remove('is-active');
    };
    reader.readAsDataURL(file);
}

function startLoadingAnimation() {
    let messageIndex = 0;
    loadingText.textContent = loadingMessages[messageIndex];
    loadingInterval = window.setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        loadingText.textContent = loadingMessages[messageIndex];
    }, 2000);
    loadingSpinner.classList.remove('hidden');
}

function stopLoadingAnimation() {
    clearInterval(loadingInterval);
    loadingSpinner.classList.add('hidden');
}

async function generateFutureImages() {
    if (!uploadedImageBase64) return;

    resultsSection.classList.add('is-active');
    startLoadingAnimation();
    timelineContainer.innerHTML = '';
    errorMessage.classList.remove('is-active');
    generateButton.disabled = true;
    
    const years = [2030, 2040, 2050, 2060, 2070];
    const lifestyleFactors = getLifestyleFactors();

    const placeholderElements = years.map(year => displayImagePlaceholder(year));

    try {
        const imagePromises = years.map(year => {
            const prompt = createPrompt(year, lifestyleFactors);
            return generateSingleImage(prompt, uploadedImageBase64!, originalMimeType);
        });
        
        const processingPromises = imagePromises.map(async (promise, index) => {
            try {
                const base64Image = await promise;
                if (base64Image) {
                    populateImageCard(placeholderElements[index], base64Image, years[index]);
                } else {
                    throw new Error("API did not return image data.");
                }
            } catch (error) {
                console.error(`Error generating image for ${years[index]}:`, error);
                showCardError(placeholderElements[index], years[index]);
            }
        });

        await Promise.all(processingPromises);

    } catch (error) {
        console.error("General error during image generation:", error);
        showError('An unexpected error occurred. Please try again.');
    } finally {
        stopLoadingAnimation();
        generateButton.disabled = false;
    }
}

function getLifestyleFactors(): LifestyleFactors {
    const smoking = parseInt(getElement<HTMLInputElement>('smoking-slider').value, 10);
    const sunExposure = parseInt(getElement<HTMLInputElement>('sun-slider').value, 10);
    const stress = parseInt(getElement<HTMLInputElement>('stress-slider').value, 10);
    return { smoking, sunExposure, stress };
}

function createPrompt(year: number, lifestyleFactors: LifestyleFactors): string {
    const factorsTextParts: string[] = [];
    if (lifestyleFactors.smoking > 5) factorsTextParts.push("a history of smoking");
    if (lifestyleFactors.sunExposure > 5) factorsTextParts.push("significant sun exposure");
    if (lifestyleFactors.stress > 5) factorsTextParts.push("high levels of stress");

    const factorsText = factorsTextParts.length === 0 
        ? "a healthy lifestyle" 
        : factorsTextParts.join(", ");

    return `Generate a single photorealistic image predicting how the person in the photo will look in the year ${year}.
- Key Instructions:
- Preserve core identity: The bone structure, eye color, and key facial landmarks must be maintained.
- Realistic, subtle aging: Apply gentle, age-appropriate wrinkles and a few hints of grey hair. The skin should still look radiant and youthful for their age. The eyes should remain sparkling and energetic.
- Background: Keep the background consistent with the original photo.
- Lifestyle influence: The person has had ${factorsText}, which should subtly affect wrinkle intensity.
- Output format: High-resolution PNG.
- Safety: Ensure the output is positive and respectful.`;
}

async function generateSingleImage(prompt: string, imageBase64: string, mimeType: string): Promise<string | null> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [{
                    inlineData: {
                        data: imageBase64,
                        mimeType: mimeType,
                    },
                }, {
                    text: prompt,
                }, ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        return null;

    } catch (error) {
        console.error(`Error generating image for prompt "${prompt}":`, error);
        throw error;
    }
}

function displayImagePlaceholder(year: number): { item: HTMLDivElement, before: HTMLDivElement } {
    const item = document.createElement('div');
    applyStyles(item, timelineItemStyle);

    const before = document.createElement('div');
    applyStyles(before, timelineItemPseudoBeforeStyle);
    item.appendChild(before);

    const contentWrapper = document.createElement('div');
    applyStyles(contentWrapper, timelineItemContentStyle);
    applyStyles(contentWrapper, loadingContentStyle);
    
    const progressContainer = document.createElement('div');
    applyStyles(progressContainer, progressContainerStyle);
    const progressBar = document.createElement('div');
    applyStyles(progressBar, progressBarStyle);
    progressContainer.appendChild(progressBar);

    const yearEl = document.createElement('p');
    applyStyles(yearEl, yearStyle);
    applyStyles(yearEl, loadingYearStyle);
    yearEl.textContent = year.toString();

    contentWrapper.appendChild(progressContainer);
    contentWrapper.appendChild(yearEl);
    item.appendChild(contentWrapper);

    timelineContainer.appendChild(item);
    return { item, before };
}

function populateImageCard(card: { item: HTMLDivElement, before: HTMLDivElement }, base64Image: string, year: number) {
    const { item, before } = card;
    const contentWrapper = item.querySelector('div:last-child') as HTMLDivElement;
    if (!contentWrapper) return;
    
    contentWrapper.innerHTML = '';

    const img = new Image();
    img.alt = `You in ${year}`;
    img.loading = 'lazy';
    applyStyles(img, imageStyle);

    // Fade-in effect
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.6s ease-in-out';
    img.onload = () => {
        setTimeout(() => { img.style.opacity = '1'; }, 50);
    };
    img.src = `data:image/png;base64,${base64Image}`;

    const yearEl = document.createElement('p');
    applyStyles(yearEl, yearStyle);
    yearEl.textContent = year.toString();
    
    const downloadLink = document.createElement('a');
    applyStyles(downloadLink, downloadLinkStyle);
    downloadLink.href = img.src;
    downloadLink.textContent = 'Download';
    downloadLink.download = `${originalFileName}_${year}.png`;

    // Hover effects for download link
    downloadLink.addEventListener('mouseover', () => applyStyles(downloadLink, downloadLinkHoverStyle));
    downloadLink.addEventListener('mouseout', () => applyStyles(downloadLink, downloadLinkStyle));


    contentWrapper.appendChild(img);
    contentWrapper.appendChild(yearEl);
    contentWrapper.appendChild(downloadLink);
    
    // Hover effects for the card
    item.addEventListener('mouseover', () => {
        applyStyles(item, { ...timelineItemStyle, ...timelineItemHoverStyle });
        applyStyles(before, { ...timelineItemPseudoBeforeStyle, ...timelineItemPseudoBeforeHoverStyle });
    });
    item.addEventListener('mouseout', () => {
        applyStyles(item, timelineItemStyle);
        applyStyles(before, timelineItemPseudoBeforeStyle);
    });
}

function showCardError(card: { item: HTMLDivElement, before: HTMLDivElement }, year: number) {
    const { item, before } = card;
    applyStyles(before, { ...timelineItemPseudoBeforeStyle, ...errorPseudoBeforeStyle });

    const contentWrapper = item.querySelector('div:last-child') as HTMLDivElement;
    if (!contentWrapper) return;
    
    contentWrapper.innerHTML = '';
    applyStyles(contentWrapper, { ...timelineItemContentStyle, ...errorContentStyle });

    const errorText = document.createElement('p');
    applyStyles(errorText, errorTextStyle);
    errorText.textContent = 'Failed';

    // Fade-in effect
    errorText.style.opacity = '0';
    errorText.style.transition = 'opacity 0.5s ease';

    const yearEl = document.createElement('p');
    applyStyles(yearEl, yearStyle);
    yearEl.textContent = year.toString();

    contentWrapper.appendChild(errorText);
    contentWrapper.appendChild(yearEl);
    
    setTimeout(() => { errorText.style.opacity = '1'; }, 50);
}

function showError(message: string) {
    errorMessage.textContent = message;
    errorMessage.classList.add('is-active');
}