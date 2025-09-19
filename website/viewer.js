"use strict";
let sprites = [];
let currentAnimation = "idle";
let currentPage = 1;
let itemsPerPage = 50;
let filteredSprites = [];
let animationSpeed = 1;
let currentModalSprite = null;
async function init() {
    setupEventListeners();
    await loadSprites();
    displaySprites();
}
function setupEventListeners() {
    var _a, _b, _c, _d, _e, _f;
    (_a = document
        .getElementById("idleBtn")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", () => setAnimation("idle"));
    (_b = document
        .getElementById("walkBtn")) === null || _b === void 0 ? void 0 : _b.addEventListener("click", () => setAnimation("walk"));
    (_c = document
        .getElementById("searchInput")) === null || _c === void 0 ? void 0 : _c.addEventListener("input", handleSearch);
    (_d = document
        .getElementById("rangeInput")) === null || _d === void 0 ? void 0 : _d.addEventListener("input", handleRangeFilter);
    const perPage = document.getElementById("perPage");
    perPage === null || perPage === void 0 ? void 0 : perPage.addEventListener("change", (e) => {
        const target = e.target;
        itemsPerPage = parseInt(target.value);
        currentPage = 1;
        displaySprites();
    });
    const speedSlider = document.getElementById("speedSlider");
    speedSlider === null || speedSlider === void 0 ? void 0 : speedSlider.addEventListener("input", (e) => {
        const target = e.target;
        animationSpeed = parseFloat(target.value);
        const speedValue = document.getElementById("speedValue");
        if (speedValue)
            speedValue.textContent = animationSpeed + "x";
        updateAnimationSpeed();
    });
    (_e = document
        .getElementById("loadAllBtn")) === null || _e === void 0 ? void 0 : _e.addEventListener("click", loadAllSprites);
    (_f = document.getElementById("resetBtn")) === null || _f === void 0 ? void 0 : _f.addEventListener("click", resetFilters);
}
async function loadSprites() {
    const loading = document.getElementById("loading");
    const error = document.getElementById("error");
    if (loading)
        loading.style.display = "block";
    if (error)
        error.style.display = "none";
    try {
        let response = null;
        try {
            response = await fetch("/api/sprites");
        }
        catch (_a) {
            response = null;
        }
        if (response && response.ok) {
            sprites = (await response.json());
        }
        else {
            try {
                response = await fetch("/spritesheets/list.json");
            }
            catch (_b) {
                response = null;
            }
            if (response && response.ok) {
                sprites = (await response.json());
            }
            else {
                sprites = await loadSpriteList();
            }
        }
        filteredSprites = [...sprites];
        const totalEl = document.getElementById("totalSprites");
        if (totalEl)
            totalEl.textContent = String(sprites.length);
        const loadedEl = document.getElementById("loadedSprites");
        if (loadedEl)
            loadedEl.textContent = String(sprites.length);
    }
    catch (err) {
        console.error("Error loading sprites:", err);
        if (error)
            error.style.display = "block";
        if (error)
            error.textContent = "Error loading sprites";
    }
    finally {
        if (loading)
            loading.style.display = "none";
    }
}
async function loadSpriteList() {
    const testIds = [];
    for (let i = 3; i <= 1000; i++)
        testIds.push(i);
    const availableSprites = [];
    for (const id of testIds) {
        const exists = await checkSpriteExists(id);
        if (exists)
            availableSprites.push({ id, path: `spritesheets/${id}.png` });
    }
    return availableSprites;
}
async function checkSpriteExists(id) {
    try {
        const img = new Image();
        img.src = `spritesheets/${id}.png`;
        return await new Promise((resolve) => {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            setTimeout(() => resolve(false), 1000);
        });
    }
    catch (_a) {
        return false;
    }
}
function displaySprites() {
    const gallery = document.getElementById("gallery");
    if (!gallery)
        return;
    gallery.innerHTML = "";
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredSprites.length);
    const paginated = filteredSprites.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredSprites.length / itemsPerPage) || 1;
    const pageEl = document.getElementById("currentPage");
    if (pageEl)
        pageEl.textContent = `${currentPage}/${totalPages}`;
    paginated.forEach((sprite) => {
        const card = createSpriteCard(sprite);
        gallery.appendChild(card);
    });
    updatePagination();
}
function createSpriteCard(sprite) {
    const card = document.createElement("div");
    card.className = "sprite-card";
    card.dataset.id = String(sprite.id);
    const container = document.createElement("div");
    container.className = "sprite-container";
    const spriteDiv = document.createElement("div");
    spriteDiv.className = `sprite ${currentAnimation}`;
    spriteDiv.style.backgroundImage = `url('spritesheets/${sprite.id}.png')`;
    spriteDiv.style.animationDuration = `${currentAnimation === "idle" ? 0.857 / animationSpeed : 1 / animationSpeed}s`;
    container.appendChild(spriteDiv);
    const idLabel = document.createElement("div");
    idLabel.className = "sprite-id";
    idLabel.textContent = `Gotchi #${sprite.id}`;
    card.appendChild(container);
    card.appendChild(idLabel);
    card.addEventListener("click", () => showModal(sprite));
    return card;
}
function setAnimation(type) {
    var _a, _b;
    currentAnimation = type;
    (_a = document
        .getElementById("idleBtn")) === null || _a === void 0 ? void 0 : _a.classList.toggle("active", type === "idle");
    (_b = document
        .getElementById("walkBtn")) === null || _b === void 0 ? void 0 : _b.classList.toggle("active", type === "walk");
    const currentAnim = document.getElementById("currentAnimation");
    if (currentAnim)
        currentAnim.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    document.querySelectorAll(".sprite").forEach((sprite) => {
        sprite.className = `sprite ${type}`;
        sprite.style.animationDuration = `${type === "idle" ? 0.857 / animationSpeed : 1 / animationSpeed}s`;
    });
}
function updateAnimationSpeed() {
    document.querySelectorAll(".sprite").forEach((sprite) => {
        const isIdle = sprite.classList.contains("idle");
        sprite.style.animationDuration = `${isIdle ? 0.857 / animationSpeed : 1 / animationSpeed}s`;
    });
}
function handleSearch(e) {
    const input = e.target;
    const searchTerm = input.value.trim();
    if (!searchTerm) {
        filteredSprites = [...sprites];
    }
    else {
        const ids = searchTerm
            .split(",")
            .map((id) => parseInt(id.trim()))
            .filter((id) => !isNaN(id));
        if (ids.length > 0)
            filteredSprites = sprites.filter((sprite) => ids.includes(sprite.id));
        else
            filteredSprites = sprites.filter((sprite) => sprite.id.toString().includes(searchTerm));
    }
    currentPage = 1;
    displaySprites();
}
function handleRangeFilter(e) {
    const input = e.target;
    const rangeText = input.value.trim();
    if (!rangeText) {
        filteredSprites = [...sprites];
    }
    else {
        const match = rangeText.match(/(\d+)-(\d+)/);
        if (match) {
            const start = parseInt(match[1]);
            const end = parseInt(match[2]);
            filteredSprites = sprites.filter((sprite) => sprite.id >= start && sprite.id <= end);
        }
    }
    currentPage = 1;
    displaySprites();
}
function updatePagination() {
    const pagination = document.getElementById("pagination");
    if (!pagination)
        return;
    pagination.innerHTML = "";
    const totalPages = Math.ceil(filteredSprites.length / itemsPerPage);
    if (totalPages <= 1)
        return;
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "←";
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            displaySprites();
        }
    });
    pagination.appendChild(prevBtn);
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4)
        startPage = Math.max(1, endPage - 4);
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement("button");
        pageBtn.textContent = String(i);
        pageBtn.classList.toggle("current", i === currentPage);
        pageBtn.addEventListener("click", () => {
            currentPage = i;
            displaySprites();
        });
        pagination.appendChild(pageBtn);
    }
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "→";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            displaySprites();
        }
    });
    pagination.appendChild(nextBtn);
}
function showModal(sprite) {
    currentModalSprite = sprite;
    const modal = document.getElementById("modal");
    modal === null || modal === void 0 ? void 0 : modal.classList.add("active");
    const title = document.getElementById("modalTitle");
    if (title)
        title.textContent = `Gotchi #${sprite.id}`;
    const modalSprite = document.getElementById("modalSprite");
    if (modalSprite) {
        modalSprite.style.backgroundImage = `url('spritesheets/${sprite.id}.png')`;
        modalSprite.className = `modal-sprite sprite ${currentAnimation}`;
        modalSprite.style.animationDuration = `${currentAnimation === "idle" ? 0.857 / animationSpeed : 1 / animationSpeed}s`;
    }
    updateModalButtons(currentAnimation);
}
function updateModalButtons(animation) {
    const info = document.getElementById("modalInfo");
    if (!info || !currentModalSprite)
        return;
    info.innerHTML = `
        <div style="margin-bottom: 20px;">
            <p style="margin: 10px 0;"><strong>Gotchi ID:</strong> #${currentModalSprite.id}</p>
            <p style="margin: 10px 0;"><strong>File:</strong> ${currentModalSprite.id}.png</p>
        </div>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button onclick="setModalAnimation('idle')" style="padding: 10px 20px; background: ${animation === "idle" ? "#1a0335" : "#ea3cf7"}; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.3s;">Idle</button>
            <button onclick="setModalAnimation('walk')" style="padding: 10px 20px; background: ${animation === "walk" ? "#1a0335" : "#ea3cf7"}; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.3s;">Walk</button>
        </div>
    `;
}
function setModalAnimation(type) {
    const modalSprite = document.getElementById("modalSprite");
    if (!modalSprite)
        return;
    modalSprite.className = `modal-sprite sprite ${type}`;
    modalSprite.style.animationDuration = `${type === "idle" ? 0.857 / animationSpeed : 1 / animationSpeed}s`;
    updateModalButtons(type);
}
// Expose for inline onclick handlers
window.setModalAnimation = setModalAnimation;
function closeModal() {
    var _a;
    (_a = document.getElementById("modal")) === null || _a === void 0 ? void 0 : _a.classList.remove("active");
    currentModalSprite = null;
}
window.closeModal = closeModal;
async function loadAllSprites() {
    const loading = document.getElementById("loading");
    if (loading)
        loading.style.display = "block";
    try {
        const response = await fetch("spritesheets/list.json");
        if (response.ok) {
            const list = (await response.json());
            sprites = list;
            filteredSprites = [...sprites];
            const totalEl = document.getElementById("totalSprites");
            if (totalEl)
                totalEl.textContent = String(sprites.length);
            const loadedEl = document.getElementById("loadedSprites");
            if (loadedEl)
                loadedEl.textContent = String(sprites.length);
            displaySprites();
            return;
        }
    }
    catch (_a) {
        // fall through
    }
    const allIds = [];
    for (let i = 1; i <= 25000; i++)
        allIds.push(i);
    const batchSize = 50;
    const availableSprites = [];
    for (let i = 0; i < allIds.length; i += batchSize) {
        const batch = allIds.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(async (id) => {
            const exists = await checkSpriteExists(id);
            return exists ? { id, path: `spritesheets/${id}.png` } : null;
        }));
        availableSprites.push(...results.filter((r) => r !== null));
        const loadedEl = document.getElementById("loadedSprites");
        if (loadedEl)
            loadedEl.textContent = String(availableSprites.length);
    }
    sprites = availableSprites;
    filteredSprites = [...sprites];
    const totalEl = document.getElementById("totalSprites");
    if (totalEl)
        totalEl.textContent = String(sprites.length);
    displaySprites();
}
function showRandomGotchi() {
    if (filteredSprites.length === 0)
        return;
    const randomIndex = Math.floor(Math.random() * filteredSprites.length);
    const randomSprite = filteredSprites[randomIndex];
    const index = filteredSprites.indexOf(randomSprite);
    currentPage = Math.floor(index / itemsPerPage) + 1;
    displaySprites();
    setTimeout(() => {
        const card = document.querySelector(`[data-id="${randomSprite.id}"]`);
        if (card) {
            card.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
            card.classList.add("selected");
            setTimeout(() => card.classList.remove("selected"), 2000);
        }
    }, 100);
}
function resetFilters() {
    const search = document.getElementById("searchInput");
    const range = document.getElementById("rangeInput");
    if (search)
        search.value = "";
    if (range)
        range.value = "";
    filteredSprites = [...sprites];
    currentPage = 1;
    displaySprites();
}
function exportVisibleIds() {
    const ids = filteredSprites.map((s) => s.id).join(", ");
    const textarea = document.createElement("textarea");
    textarea.value = ids;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    alert(`Copied ${filteredSprites.length} IDs to clipboard!`);
}
document.addEventListener("DOMContentLoaded", () => {
    void init();
});
