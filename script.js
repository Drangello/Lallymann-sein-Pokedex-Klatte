const pokedex = document.getElementById("pokedex");
const loadMoreBtn = document.getElementById("loadMoreBtn");

let offset = 0;
const limit = 30;

async function loadPokemon(offset, limit) {
  const url = `https://pokeapi.co/api/v2/pokemon?offset=${offset}&limit=${limit}`;
  const res = await fetch(url);
  const data = await res.json();

  const pokemonPromises = data.results.map(async (pokemon) => {
    const pokeRes = await fetch(pokemon.url);
    return pokeRes.json();
  });

  const allPokemon = await Promise.all(pokemonPromises);
  displayPokemon(allPokemon);
}

function displayPokemon(pokemonList) {
  pokemonList.forEach(pokemon => {
    const card = document.createElement("div");
    card.classList.add("pokemon-card");

    card.innerHTML = `
      <h3>${pokemon.name.toUpperCase()}</h3>
      <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}">
      <p><strong>ID:</strong> ${pokemon.id}</p>
      <p><strong>Typ:</strong> ${pokemon.types.map(t => t.type.name).join(", ")}</p>
    `;

    pokedex.appendChild(card);
  });
}

loadPokemon(offset, limit);

loadMoreBtn.addEventListener("click", () => {
  offset += limit;
  loadPokemon(offset, limit);
});

let currentPokemonIndex = 0;
let currentPokemonList = [];
let isMuted = false;
let cryAudio = null;

function displayPokemon(pokemonList) {
  currentPokemonList = [...currentPokemonList, ...pokemonList]; // speichern
  
  pokemonList.forEach((pokemon, index) => {
    const card = document.createElement("div");
    card.classList.add("pokemon-card");

    card.innerHTML = `
      <h3>${pokemon.name.toUpperCase()}</h3>
      <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}">
      <p><strong>ID:</strong> ${pokemon.id}</p>
      <p><strong>Typ:</strong> ${pokemon.types.map(t => t.type.name).join(", ")}</p>
    `;

    card.addEventListener("click", () => {
      currentPokemonIndex = currentPokemonList.findIndex(p => p.id === pokemon.id);
      openDialog(pokemon);
    });

    pokedex.appendChild(card);
  });
}

function openDialog(pokemon) {
  const dialog = document.getElementById("pokemonDialog");
  dialog.classList.remove("hidden");

  document.getElementById("dialogName").textContent = pokemon.name.toUpperCase();
  document.getElementById("dialogImg").src = pokemon.sprites.other["official-artwork"].front_default;
  document.getElementById("dialogInfo").textContent = 
    `ID: ${pokemon.id} | Typ: ${pokemon.types.map(t => t.type.name).join(", ")}`;

  // Pokémon-Cry laden
  playCry(pokemon.id);

  // Stats-Chart
  const stats = pokemon.stats.map(s => s.base_stat);
  const labels = pokemon.stats.map(s => s.stat.name);

  if (window.statsChartInstance) {
    window.statsChartInstance.destroy();
  }
  const ctx = document.getElementById("statsChart").getContext("2d");
  window.statsChartInstance = new Chart(ctx, {
    type: "radar",
    data: {
      labels: labels,
      datasets: [{
        label: pokemon.name,
        data: stats,
        backgroundColor: "rgba(255,99,132,0.2)",
        borderColor: "rgba(255,99,132,1)"
      }]
    },
    options: {
      scales: {
        r: { beginAtZero: true }
      }
    }
  });
}

function playCry(id) {
  if (cryAudio) cryAudio.pause();
  cryAudio = new Audio(`https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`);
  if (!isMuted) cryAudio.play();
}

// Dialog-Buttons
document.getElementById("closeDialog").addEventListener("click", () => {
  document.getElementById("pokemonDialog").classList.add("hidden");
  if (cryAudio) cryAudio.pause();
});

document.getElementById("muteBtn").addEventListener("click", () => {
  isMuted = !isMuted;
  document.getElementById("muteBtn").textContent = isMuted ? "🔇" : "🔊";
  if (isMuted && cryAudio) cryAudio.pause();
});

document.getElementById("nextPokemon").addEventListener("click", () => {
  currentPokemonIndex = (currentPokemonIndex + 1) % currentPokemonList.length;
  openDialog(currentPokemonList[currentPokemonIndex]);
});

document.getElementById("prevPokemon").addEventListener("click", () => {
  currentPokemonIndex = (currentPokemonIndex - 1 + currentPokemonList.length) % currentPokemonList.length;
  openDialog(currentPokemonList[currentPokemonIndex]);
});
async function openDialog(pokemon) {
  const dialog = document.getElementById("pokemonDialog");
  dialog.classList.remove("hidden");

  document.getElementById("dialogName").textContent = pokemon.name.toUpperCase();
  document.getElementById("dialogImg").src = pokemon.sprites.other["official-artwork"].front_default;

  // Cry abspielen
  playCry(pokemon.id);
  // Seiten zurücksetzen
  showPage(1);
  // --- Seite 1: Pokédex-Eintrag ---
  const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.id}/`);
  const speciesData = await speciesRes.json();
  const entry = speciesData.flavor_text_entries.find(e => e.language.name === "en")?.flavor_text 
             || "No entry available.";
  document.getElementById("pokedexEntry").textContent = entry.replace(g, " ");

  // --- Seite 2: Stats Diagramm ---
  const stats = pokemon.stats.map(s => s.base_stat);
  const labels = pokemon.stats.map(s => s.stat.name);

  if (window.statsChartInstance) {
    window.statsChartInstance.destroy();
  }
  const ctx = document.getElementById("statsChart").getContext("2d");
  window.statsChartInstance = new Chart(ctx, {
    type: "radar",
    data: {
      labels: labels,
      datasets: [{
        label: pokemon.name,
        data: stats,
        backgroundColor: "rgba(54,162,235,0.2)",
        borderColor: "rgba(54,162,235,1)"
      }]
    },
    options: {
      scales: {
        r: { beginAtZero: true }
      }
    }
  });

  // --- Seite 3: Evolution ---
  const evoRes = await fetch(speciesData.evolution_chain.url);
  const evoData = await evoRes.json();
  const evoHtml = buildEvolutionChain(evoData.chain);
  document.getElementById("evolutionChain").innerHTML = evoHtml;
}

// Helfer: Evolutionen aufbauen (rekursiv)
function buildEvolutionChain(chain) {
  let evo = `<div>${chain.species.name}</div>`;
  if (chain.evolves_to.length > 0) {
    evo += `<div class="evo-arrow">➡️</div>`;
    evo += buildEvolutionChain(chain.evolves_to[0]);
  }
  return evo;
}

// Helfer: Seiten wechseln
function showPage(num) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page" + num).classList.add("active");
}

// Event Listener für Tabs
document.querySelectorAll(".page-nav button").forEach(btn => {
  btn.addEventListener("click", () => {
    showPage(btn.dataset.page);
  });
});
