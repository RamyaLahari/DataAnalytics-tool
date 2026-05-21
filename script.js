const barsEl = document.querySelector("#arrayBars");
const playPauseBtn = document.querySelector("#playPause");
const stepBtn = document.querySelector("#step");
const resetBtn = document.querySelector("#reset");
const shuffleBtn = document.querySelector("#shuffle");
const sizeInput = document.querySelector("#size");
const speedInput = document.querySelector("#speed");
const pivotModeSelect = document.querySelector("#pivotMode");
const comparisonsEl = document.querySelector("#comparisons");
const swapsEl = document.querySelector("#swaps");
const partitionsEl = document.querySelector("#partitions");
const statusTitleEl = document.querySelector("#statusTitle");
const statusTextEl = document.querySelector("#statusText");
const traceEl = document.querySelector("#trace");
const codeLines = document.querySelectorAll(".code span");

let array = [];
let originalArray = [];
let steps = [];
let stepIndex = 0;
let isPlaying = false;
let playTimer = null;

const state = {
  comparisons: 0,
  swaps: 0,
  partitions: 0,
  sorted: new Set(),
  active: null,
};

function randomArray(size) {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 92) + 8);
}

function choosePivotIndex(low, high, mode) {
  if (mode === "first") return low;
  if (mode === "middle") return Math.floor((low + high) / 2);
  if (mode === "random") return Math.floor(Math.random() * (high - low + 1)) + low;
  return high;
}

function cloneValues(values) {
  return values.slice();
}

function createSteps(source, pivotMode) {
  const values = cloneValues(source);
  const generated = [];

  const add = (type, detail) => {
    generated.push({
      type,
      values: cloneValues(values),
      sorted: detail.sorted ? Array.from(detail.sorted) : [],
      ...detail,
    });
  };

  const swap = (a, b, sorted = []) => {
    if (a === b) return;
    [values[a], values[b]] = [values[b], values[a]];
    add("swap", {
      a,
      b,
      sorted,
      line: "compare",
      title: "Swap",
      text: `Swap values at indexes ${a} and ${b}.`,
    });
  };

  const partition = (low, high) => {
    let pivotIndex = choosePivotIndex(low, high, pivotMode);
    add("partition", {
      low,
      high,
      pivot: pivotIndex,
      line: "pivot",
      title: "Choose Pivot",
      text: `Partition indexes ${low} through ${high}; pivot starts at index ${pivotIndex}.`,
    });

    if (pivotIndex !== high) {
      swap(pivotIndex, high);
      pivotIndex = high;
    }

    const pivotValue = values[high];
    let storeIndex = low;
    add("scan", {
      low,
      high,
      pivot: high,
      storeIndex,
      line: "scan",
      title: "Scan",
      text: `Scan for values smaller than pivot ${pivotValue}.`,
    });

    for (let current = low; current < high; current += 1) {
      add("compare", {
        low,
        high,
        pivot: high,
        current,
        storeIndex,
        line: "compare",
        title: "Compare",
        text: `${values[current]} ${values[current] < pivotValue ? "is smaller than" : "stays right of"} pivot ${pivotValue}.`,
      });

      if (values[current] < pivotValue) {
        swap(current, storeIndex);
        storeIndex += 1;
      }
    }

    swap(storeIndex, high);
    add("place", {
      low,
      high,
      pivot: storeIndex,
      sorted: [storeIndex],
      line: "place",
      title: "Pivot Placed",
      text: `Pivot ${values[storeIndex]} is now fixed at index ${storeIndex}.`,
    });
    return storeIndex;
  };

  const quicksort = (low, high) => {
    add("quick", {
      low,
      high,
      line: "quick",
      title: "Quicksort",
      text: `Sort the range from index ${low} to ${high}.`,
    });

    if (low < high) {
      add("base", {
        low,
        high,
        line: "base",
        title: "Check Range",
        text: `Range ${low}-${high} has more than one value.`,
      });
      const pivotIndex = partition(low, high);
      add("left", {
        low,
        high: pivotIndex - 1,
        line: "left",
        title: "Left Side",
        text: `Recur on values left of index ${pivotIndex}.`,
      });
      quicksort(low, pivotIndex - 1);
      add("right", {
        low: pivotIndex + 1,
        high,
        line: "right",
        title: "Right Side",
        text: `Recur on values right of index ${pivotIndex}.`,
      });
      quicksort(pivotIndex + 1, high);
    } else if (low === high) {
      add("single", {
        low,
        high,
        sorted: [low],
        line: "base",
        title: "Single Value",
        text: `Index ${low} is already sorted.`,
      });
    } else {
      add("empty", {
        low,
        high,
        line: "base",
        title: "Empty Range",
        text: "There is no work in this range.",
      });
    }
  };

  add("start", {
    line: "quick",
    title: "Ready",
    text: "The unsorted array is ready.",
  });
  quicksort(0, values.length - 1);
  add("done", {
    sorted: values.map((_, index) => index),
    line: "quick",
    title: "Sorted",
    text: "Every value is now in ascending order.",
  });

  return generated;
}

function renderBars(snapshot = array, active = {}) {
  const max = Math.max(...snapshot);
  barsEl.innerHTML = "";

  snapshot.forEach((value, index) => {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.setProperty("--height", `${(value / max) * 88 + 8}%`);
    bar.dataset.value = value;

    if (active.sorted?.includes(index) || state.sorted.has(index)) bar.classList.add("sorted");
    if (index === active.pivot) bar.classList.add("pivot");
    if (index === active.current || index === active.storeIndex) bar.classList.add("compare");
    if (index === active.a || index === active.b) bar.classList.add("swap");

    barsEl.appendChild(bar);
  });
}

function setStatus(title, text) {
  statusTitleEl.textContent = title;
  statusTextEl.textContent = text;
}

function highlightLine(line) {
  codeLines.forEach((node) => {
    node.classList.toggle("active", node.dataset.line === line);
  });
}

function addTrace(step) {
  const item = document.createElement("li");
  item.className = "current";
  item.textContent = step.text;
  traceEl.querySelectorAll(".current").forEach((node) => node.classList.remove("current"));
  traceEl.prepend(item);

  while (traceEl.children.length > 28) {
    traceEl.removeChild(traceEl.lastElementChild);
  }
}

function updateStats() {
  comparisonsEl.textContent = state.comparisons;
  swapsEl.textContent = state.swaps;
  partitionsEl.textContent = state.partitions;
}

function resetCounters() {
  state.comparisons = 0;
  state.swaps = 0;
  state.partitions = 0;
  state.sorted = new Set();
  state.active = null;
  updateStats();
}

function applyStep(step) {
  array = cloneValues(step.values);
  state.active = step;

  if (step.type === "compare") state.comparisons += 1;
  if (step.type === "swap") state.swaps += 1;
  if (step.type === "partition") state.partitions += 1;
  if (step.sorted) {
    step.sorted.forEach((index) => state.sorted.add(index));
  }

  renderBars(array, step);
  setStatus(step.title, step.text);
  highlightLine(step.line);
  addTrace(step);
  updateStats();

  if (step.type === "done") {
    stopPlayback();
    playPauseBtn.textContent = "Play";
  }
}

function stepForward() {
  if (stepIndex >= steps.length) {
    stopPlayback();
    return;
  }

  applyStep(steps[stepIndex]);
  stepIndex += 1;
}

function playbackDelay() {
  const max = Number(speedInput.max);
  const min = Number(speedInput.min);
  return max + min - Number(speedInput.value);
}

function play() {
  if (isPlaying) return;
  isPlaying = true;
  playPauseBtn.textContent = "Pause";
  sizeInput.disabled = true;
  pivotModeSelect.disabled = true;

  const run = () => {
    if (!isPlaying) return;
    stepForward();
    if (stepIndex < steps.length) {
      playTimer = window.setTimeout(run, playbackDelay());
    }
  };

  run();
}

function stopPlayback() {
  isPlaying = false;
  window.clearTimeout(playTimer);
  playTimer = null;
  playPauseBtn.textContent = "Play";
  sizeInput.disabled = false;
  pivotModeSelect.disabled = false;
}

function prepareRun(values = originalArray) {
  stopPlayback();
  array = cloneValues(values);
  originalArray = cloneValues(values);
  steps = createSteps(array, pivotModeSelect.value);
  stepIndex = 0;
  resetCounters();
  traceEl.innerHTML = "";
  renderBars(array);
  setStatus("Ready", "Press Play to watch quicksort partition the array around a pivot.");
  highlightLine("quick");
}

function newShuffle() {
  prepareRun(randomArray(Number(sizeInput.value)));
}

playPauseBtn.addEventListener("click", () => {
  if (isPlaying) {
    stopPlayback();
    setStatus("Paused", "Use Step to inspect the next operation, or press Play to continue.");
  } else {
    play();
  }
});

stepBtn.addEventListener("click", () => {
  stopPlayback();
  stepForward();
});

resetBtn.addEventListener("click", () => {
  prepareRun(originalArray);
});

shuffleBtn.addEventListener("click", newShuffle);

sizeInput.addEventListener("input", newShuffle);

pivotModeSelect.addEventListener("change", () => {
  prepareRun(array);
});

speedInput.addEventListener("input", () => {
  if (isPlaying) {
    stopPlayback();
    play();
  }
});

prepareRun(randomArray(Number(sizeInput.value)));
