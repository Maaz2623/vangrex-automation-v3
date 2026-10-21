import { Desktop } from "@mediar-ai/terminator";
import * as Terminator from "@mediar-ai/terminator";
import { writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function getCurrentPointerPosition(): [number, number] {
  const output = execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      'Add-Type -AssemblyName System.Windows.Forms; $p = [System.Windows.Forms.Cursor]::Position; Write-Output "$($p.X),$($p.Y)"',
    ],
    { encoding: "utf8" },
  ).trim();

  const [x, y] = output.split(",").map(Number);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(`Invalid pointer coordinates: ${output}`);
  }

  return [x, y];
}

const desktop = new Desktop();

await sleep(2000);

const application = await desktop.getCurrentApplication();

const tree = desktop.getWindowTreeResult(application.processName(), undefined, {
  formatOutput: true,
  treeOutputFormat: Terminator.TreeOutputFormat.CompactYaml,
  propertyMode: Terminator.PropertyLoadingMode.Complete,
  uiSettleDelayMs: 10,
});

await writeFile("tree.txt", tree.formatted as string, "utf-8");

const element = await application
  .locator("role:Pane|name:Using Brush tool on Canvas")
  .first(2000);

console.log("Canvas element:", element);

// Canvas bounds from the UI tree: [x, y, width, height]
const CANVAS = {
  left: 0,
  top: 139,
  width: 1367,
  height: 603,
  margin: 15,
};

const MIN_X = CANVAS.left + CANVAS.margin;
const MIN_Y = CANVAS.top + CANVAS.margin;
const MAX_X = CANVAS.left + CANVAS.width - CANVAS.margin;
const MAX_Y = CANVAS.top + CANVAS.height - CANVAS.margin;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toScreenPoint(x: number, y: number): [number, number] {
  return [
    Math.round(clamp(x, MIN_X, MAX_X)),
    Math.round(clamp(y, MIN_Y, MAX_Y)),
  ];
}

type Point = [number, number];
type Line = [Point, Point];

// House dimensions and placement, in screen coordinates.
// Center the drawing horizontally and keep it comfortably inside the canvas.
const HOUSE_WIDTH = 460;
const HOUSE_HEIGHT = 360;

const HOUSE_LEFT = Math.round(CANVAS.left + (CANVAS.width - HOUSE_WIDTH) / 2);
const HOUSE_TOP = Math.round(
  CANVAS.top + (CANVAS.height - HOUSE_HEIGHT) / 2 + 15,
);

const P = (x: number, y: number): Point =>
  toScreenPoint(HOUSE_LEFT + x, HOUSE_TOP + y);

const lines: Line[] = [
  // Chimney
  [
    [285, 105],
    [285, 35],
  ],
  [
    [285, 35],
    [325, 35],
  ],
  [
    [325, 35],
    [325, 125],
  ],
  [
    [278, 35],
    [332, 35],
  ],
  [
    [278, 28],
    [332, 28],
  ],
  [
    [278, 28],
    [278, 35],
  ],
  [
    [332, 28],
    [332, 35],
  ],
  [
    [285, 55],
    [325, 55],
  ],
  [
    [285, 80],
    [325, 80],
  ],

  // Main roof
  [
    [45, 180],
    [230, 55],
  ],
  [
    [230, 55],
    [415, 180],
  ],
  [
    [25, 185],
    [230, 40],
  ],
  [
    [230, 40],
    [435, 185],
  ],
  [
    [25, 185],
    [45, 185],
  ],
  [
    [415, 185],
    [435, 185],
  ],

  // Roof tile details
  [
    [65, 166],
    [110, 166],
  ],
  [
    [95, 145],
    [140, 145],
  ],
  [
    [125, 124],
    [170, 124],
  ],
  [
    [155, 103],
    [200, 103],
  ],
  [
    [185, 82],
    [220, 82],
  ],
  [
    [245, 82],
    [275, 82],
  ],
  [
    [290, 103],
    [325, 103],
  ],
  [
    [320, 124],
    [360, 124],
  ],
  [
    [350, 145],
    [390, 145],
  ],
  [
    [375, 166],
    [405, 166],
  ],

  // Attic gable
  [
    [145, 180],
    [230, 120],
  ],
  [
    [230, 120],
    [315, 180],
  ],

  // Attic round window
  ...Array.from({ length: 48 }, (_, i): Line => {
    const point = (j: number): Point => {
      const angle = (j / 48) * Math.PI * 2;
      return [230 + 22 * Math.cos(angle), 158 + 22 * Math.sin(angle)];
    };
    return [point(i), point(i + 1)];
  }),
  [
    [208, 158],
    [252, 158],
  ],
  [
    [230, 136],
    [230, 180],
  ],

  // Main house walls
  [
    [65, 180],
    [65, 350],
  ],
  [
    [395, 180],
    [395, 350],
  ],
  [
    [65, 350],
    [395, 350],
  ],
  [
    [55, 350],
    [405, 350],
  ],
  [
    [55, 360],
    [405, 360],
  ],
  [
    [55, 350],
    [55, 360],
  ],
  [
    [405, 350],
    [405, 360],
  ],

  // Left window and frame
  [
    [85, 220],
    [150, 220],
  ],
  [
    [150, 220],
    [150, 285],
  ],
  [
    [150, 285],
    [85, 285],
  ],
  [
    [85, 285],
    [85, 220],
  ],
  [
    [78, 213],
    [157, 213],
  ],
  [
    [157, 213],
    [157, 292],
  ],
  [
    [157, 292],
    [78, 292],
  ],
  [
    [78, 292],
    [78, 213],
  ],
  [
    [117, 220],
    [117, 285],
  ],
  [
    [85, 252],
    [150, 252],
  ],
  [
    [75, 296],
    [160, 296],
  ],

  // Right window and frame
  [
    [310, 220],
    [375, 220],
  ],
  [
    [375, 220],
    [375, 285],
  ],
  [
    [375, 285],
    [310, 285],
  ],
  [
    [310, 285],
    [310, 220],
  ],
  [
    [303, 213],
    [382, 213],
  ],
  [
    [382, 213],
    [382, 292],
  ],
  [
    [382, 292],
    [303, 292],
  ],
  [
    [303, 292],
    [303, 213],
  ],
  [
    [342, 220],
    [342, 285],
  ],
  [
    [310, 252],
    [375, 252],
  ],
  [
    [300, 296],
    [385, 296],
  ],

  // Door frame
  [
    [190, 350],
    [190, 255],
  ],
  [
    [190, 255],
    [270, 255],
  ],
  [
    [270, 255],
    [270, 350],
  ],
  [
    [182, 350],
    [182, 248],
  ],
  [
    [182, 248],
    [278, 248],
  ],
  [
    [278, 248],
    [278, 350],
  ],

  // Door panels
  [
    [202, 267],
    [258, 267],
  ],
  [
    [258, 267],
    [258, 302],
  ],
  [
    [258, 302],
    [202, 302],
  ],
  [
    [202, 302],
    [202, 267],
  ],
  [
    [202, 312],
    [228, 312],
  ],
  [
    [228, 312],
    [228, 340],
  ],
  [
    [228, 340],
    [202, 340],
  ],
  [
    [202, 340],
    [202, 312],
  ],
  [
    [234, 312],
    [258, 312],
  ],
  [
    [258, 312],
    [258, 340],
  ],
  [
    [258, 340],
    [234, 340],
  ],
  [
    [234, 340],
    [234, 312],
  ],

  // Door handle
  [
    [250, 308],
    [253, 308],
  ],

  // Brick accents
  [
    [75, 315],
    [115, 315],
  ],
  [
    [130, 315],
    [175, 315],
  ],
  [
    [285, 315],
    [325, 315],
  ],
  [
    [340, 315],
    [385, 315],
  ],
  [
    [85, 332],
    [105, 332],
  ],
  [
    [125, 332],
    [165, 332],
  ],
  [
    [290, 332],
    [330, 332],
  ],
  [
    [350, 332],
    [385, 332],
  ],

  // Steps
  [
    [175, 350],
    [285, 350],
  ],
  [
    [168, 360],
    [292, 360],
  ],
  [
    [160, 370],
    [300, 370],
  ],

  // Pathway
  [
    [190, 370],
    [155, 420],
  ],
  [
    [270, 370],
    [305, 420],
  ],
  [
    [155, 420],
    [305, 420],
  ],
  [
    [181, 390],
    [279, 390],
  ],
  [
    [170, 405],
    [290, 405],
  ],

  // Tree trunk and branches
  [
    [20, 350],
    [20, 290],
  ],
  [
    [36, 350],
    [36, 290],
  ],
  [
    [20, 320],
    [36, 305],
  ],
  [
    [36, 325],
    [20, 310],
  ],
  [
    [28, 295],
    [10, 278],
  ],
  [
    [28, 295],
    [46, 276],
  ],

  // Tree canopy
  ...Array.from({ length: 60 }, (_, i): Line => {
    const point = (j: number): Point => {
      const angle = (j / 60) * Math.PI * 2;
      const radius = 32 + 5 * Math.sin(angle * 5);
      return [28 + radius * Math.cos(angle), 265 + radius * Math.sin(angle)];
    };
    return [point(i), point(i + 1)];
  }),

  // Left bush
  ...Array.from({ length: 36 }, (_, i): Line => {
    const point = (j: number): Point => {
      const angle = (j / 36) * Math.PI * 2;
      return [90 + 25 * Math.cos(angle), 365 + 13 * Math.sin(angle)];
    };
    return [point(i), point(i + 1)];
  }),

  // Right bush
  ...Array.from({ length: 36 }, (_, i): Line => {
    const point = (j: number): Point => {
      const angle = (j / 36) * Math.PI * 2;
      return [370 + 25 * Math.cos(angle), 365 + 13 * Math.sin(angle)];
    };
    return [point(i), point(i + 1)];
  }),

  // Ground line
  [
    [0, 385],
    [450, 385],
  ],
];

// Convert house-local coordinates into safe screen coordinates.
const screenLines: Line[] = lines.map(([[x1, y1], [x2, y2]]) => [
  P(x1, y1),
  P(x2, y2),
]);

const delay = 2;
const stepsPerLine = 24;

async function moveSafely(x: number, y: number): Promise<void> {
  const [safeX, safeY] = toScreenPoint(x, y);
  await application.mouseMove(safeX, safeY);
}

async function drawLine(
  [startX, startY]: Point,
  [endX, endY]: Point,
): Promise<void> {
  // All endpoints and interpolated points stay within the canvas.
  const [sx, sy] = toScreenPoint(startX, startY);
  const [ex, ey] = toScreenPoint(endX, endY);

  await moveSafely(sx, sy);
  await sleep(2);

  await application.mouseClickAndHold(sx, sy);

  try {
    for (let step = 1; step <= stepsPerLine; step++) {
      const t = step / stepsPerLine;
      const eased = t * t * (3 - 2 * t);

      const x = Math.round(sx + (ex - sx) * eased);
      const y = Math.round(sy + (ey - sy) * eased);

      await moveSafely(x, y);
      await sleep(delay);
    }
  } finally {
    await application.mouseRelease();
  }

  await sleep(2);
}

// Start from the actual pointer location, then travel to a proper
// starting point inside the canvas before drawing.
const [currentX, currentY] = getCurrentPointerPosition();
const drawingStart = P(25, 185);

console.log("Current pointer:", [currentX, currentY]);
console.log("Canvas-safe drawing start:", drawingStart);
console.log(`Drawing detailed house (${screenLines.length} line segments)...`);

await moveSafely(currentX, currentY);
await application.mouseMove(drawingStart[0], drawingStart[1]);
await sleep(500);

for (const [start, end] of screenLines) {
  await drawLine(start, end);
}

console.log("Detailed house drawing completed.");
