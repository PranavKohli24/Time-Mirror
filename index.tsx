/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const dropZone = document.getElementById('drop-zone') as HTMLDivElement;
const imageUpload = document.getElementById('image-upload') as HTMLInputElement;
const imagePreviewContainer = document.getElementById('image-preview-container') as HTMLDivElement;
const imagePreview = document.getElementById('image-preview') as HTMLImageElement;
const controlsSection = document.getElementById('controls-section') as HTMLDivElement;
const resultsSection = document.getElementById('results-section') as HTMLDivElement;
const timelineContainer = document.getElementById('timeline-container') as HTMLDivElement;
const loadingSpinner = document.getElementById('loading-spinner') as HTMLDivElement;
const loadingText = document.getElementById('loading-text') as HTMLParagraphElement;
const generateButton = document.getElementById('generate-button') as HTMLButtonElement;
const errorMessage = document.getElementById('error-message') as HTMLDivElement;

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

// Drag and Drop functionality
dropZone.addEventListener('click', () => imageUpload.click());
dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});
dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('dragover');
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
        handleFile(files[0]);
    }
});
imageUpload.addEventListener('change', (event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        handleFile(file);
    }
});

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


generateButton.addEventListener('click', () => {
    if (uploadedImageBase64) {
        generateFutureImages();
    } else {
        showError('Please upload an image first.');
    }
});

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

    try {
        const imagePromises = years.map(year => {
            const prompt = createPrompt(year, lifestyleFactors);
            return generateSingleImage(prompt, uploadedImageBase64, originalMimeType);
        });

        const generatedImages = await Promise.all(imagePromises);

        generatedImages.forEach((base64Image, index) => {
            if (base64Image) {
                const year = years[index];
                displayImage(base64Image, year);
            }
        });

    } catch (error) {
        console.error("Error generating images:", error);
        showError('Sorry, something went wrong while generating the images. Please try again.');
    } finally {
        stopLoadingAnimation();
        generateButton.disabled = false;
    }
}

function getLifestyleFactors() {
    const smoking = parseInt((document.getElementById('smoking-slider') as HTMLInputElement).value, 10);
    const sunExposure = parseInt((document.getElementById('sun-slider') as HTMLInputElement).value, 10);
    const stress = parseInt((document.getElementById('stress-slider') as HTMLInputElement).value, 10);
    
    let factorsText = [];
    if (smoking > 5) factorsText.push("a history of smoking");
    if (sunExposure > 5) factorsText.push("significant sun exposure");
    if (stress > 5) factorsText.push("high levels of stress");

    if (factorsText.length === 0) return "a healthy lifestyle";
    return factorsText.join(", ");
}

function createPrompt(year: number, lifestyleFactors: string): string {
    return `Generate a single photorealistic image predicting how the person in the photo will look in the year ${year}.
- Key Instructions:
- Preserve core identity: The bone structure, eye color, and key facial landmarks must be maintained.
- Realistic, subtle aging: Apply gentle, age-appropriate wrinkles and a few hints of grey hair. The skin should still look radiant and youthful for their age. The eyes should remain sparkling and energetic.
- Background: Keep the background consistent with the original photo.
- Lifestyle influence: The person has had ${lifestyleFactors}, which should subtly affect wrinkle intensity.
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
        // Propagate the error to be caught by the main try-catch block
        throw error;
    }
}


function displayImage(base64Image: string, year: number) {
    const item = document.createElement('div');
    item.className = 'timeline-item';

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'timeline-item-content';

    const img = new Image();
    img.src = `data:image/png;base64,${base64Image}`;
    img.alt = `You in ${year}`;
    img.loading = 'lazy';

    const yearEl = document.createElement('p');
    yearEl.className = 'year';
    yearEl.textContent = year.toString();
    
    const downloadLink = document.createElement('a');
    downloadLink.href = img.src;
    downloadLink.textContent = 'Download';
    downloadLink.className = 'download-link';
    downloadLink.download = `${originalFileName}_${year}.png`;

    contentWrapper.appendChild(img);
    contentWrapper.appendChild(yearEl);
    contentWrapper.appendChild(downloadLink);
    item.appendChild(contentWrapper);

    timelineContainer.appendChild(item);
}


function showError(message: string) {
    errorMessage.textContent = message;
    errorMessage.classList.add('is-active');
}