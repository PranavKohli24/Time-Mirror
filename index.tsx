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

// --- DOM Elements ---
const dropZone = document.getElementById('drop-zone')!;
const imageUploadInput = document.getElementById('image-upload') as HTMLInputElement;
const imagePreviewContainer = document.getElementById('image-preview-container')!;
const imagePreview = document.getElementById('image-preview') as HTMLImageElement;
const controlsSection = document.getElementById('controls-section')!;
const resultsSection = document.getElementById('results-section')!;
const timelineContainer = document.getElementById('timeline-container')!;
const loadingSpinner = document.getElementById('loading-spinner')!;
const loadingTextElement = document.getElementById('loading-text')!;
const generateButton = document.getElementById('generate-button') as HTMLButtonElement;
const errorMessageContainer = document.getElementById('error-message')!;
const sliders = {
    smoking: document.getElementById('smoking-slider') as HTMLInputElement,
    sunExposure: document.getElementById('sunExposure-slider') as HTMLInputElement,
    stress: document.getElementById('stress-slider') as HTMLInputElement,
};

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

// --- UI Rendering ---
function updateUI() {
    // Image upload view
    if (uploadedImage) {
        dropZone.classList.add('hidden');
        imagePreviewContainer.classList.remove('hidden');
        imagePreview.src = uploadedImage.objectURL;
        controlsSection.classList.add('is-active');
    } else {
        dropZone.classList.remove('hidden');
        imagePreviewContainer.classList.add('hidden');
        controlsSection.classList.remove('is-active');
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
        resultsSection.classList.add('is-active');
    } else {
        resultsSection.classList.remove('is-active');
    }

    // Error message
    if (errorMessage) {
        errorMessageContainer.textContent = errorMessage;
        errorMessageContainer.classList.add('is-active');
    } else {
        errorMessageContainer.textContent = '';
        errorMessageContainer.classList.remove('is-active');
    }

    // Timeline items
    timelineContainer.innerHTML = results.map(result => {
        switch (result.status) {
            case 'loading':
                return `
                    <div class="timeline-item timeline-item--loading">
                        <div class="timeline-item__content">
                            <div class="progress-bar-container"><div class="progress-bar"></div></div>
                            <p class="timeline-item__year timeline-item__year--loading">${result.year}</p>
                        </div>
                    </div>`;
            case 'success':
                return `
                    <div class="timeline-item timeline-item--success">
                        <div class="timeline-item__content">
                            <img src="${result.imageUrl}" alt="You in ${result.year}" class="timeline-item__image is-visible" loading="lazy" />
                            <p class="timeline-item__year">${result.year}</p>
                            <a href="${result.imageUrl}" download="${uploadedImage?.fileName}_${result.year}.png" class="timeline-item__download">Download</a>
                        </div>
                    </div>`;
            case 'error':
                return `
                    <div class="timeline-item timeline-item--error">
                        <div class="timeline-item__content">
                            <p class="timeline-item__error-text">Failed</p>
                            <p class="timeline-item__year">${result.year}</p>
                        </div>
                    </div>`;
            default:
                return '';
        }
    }).join('');
}


// --- Event Handlers & Logic ---

function handleFile(file: File) {
    const fileName = file.name.split('.').slice(0, -1).join('.');
    const mimeType = file.type;
    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target?.result as string;
        // Clean up previous object URL
        if (uploadedImage?.objectURL) {
            URL.revokeObjectURL(uploadedImage.objectURL);
        }
        uploadedImage = {
            base64: result.split(',')[1],
            mimeType,
            fileName,
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
    const factorsTextParts: string[] = [];
    if (factors.smoking > 5) factorsTextParts.push("a history of smoking");
    if (factors.sunExposure > 5) factorsTextParts.push("significant sun exposure");
    if (factors.stress > 5) factorsTextParts.push("high levels of stress");
    const factorsText = factorsTextParts.length === 0 ? "a healthy lifestyle" : factorsTextParts.join(", ");

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
                    if (base64Image) {
                        results[resultIndex] = { ...results[resultIndex], status: 'success', imageUrl: `data:image/png;base64,${base64Image}` };
                    } else {
                         results[resultIndex] = { ...results[resultIndex], status: 'error' };
                    }
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
};

// --- Initializer ---
function init() {
    dropZone.addEventListener('click', () => imageUploadInput.click());
    imageUploadInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) handleFile(file);
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', (e) => {
        (e.currentTarget as HTMLElement).classList.remove('dragover');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).classList.remove('dragover');
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    });

    generateButton.addEventListener('click', handleGenerate);

    (Object.keys(sliders) as Array<keyof LifestyleFactors>).forEach(key => {
        sliders[key].addEventListener('input', (e) => {
            lifestyleFactors[key] = parseInt((e.target as HTMLInputElement).value, 10);
        });
    });

    updateUI(); // Initial render
}

init();