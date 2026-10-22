import "dotenv/config";
import { Desktop } from "@mediar-ai/terminator";
import { generateDrawing } from "./draw.agent";

// --------------------------------------------------
// Configuration
// --------------------------------------------------

const PROMPT = "Draw a house.";

const CANVAS = {
  left: 0,
  top: 139,
  width: 1367,
  height: 603,
  margin: 15,
};

// These are the drawing agent's SVG coordinate dimensions.
const SOURCE_WIDTH = 1000;
const SOURCE_HEIGHT = 430;

// Your existing engine uses safe screen bounds.
const SAFE = {
  minX: 15,
  maxX: 1352,
  minY: 154,
  maxY: 727,
};

const PIXELS_PER_STEP = 2;
const MOVE_INTERVAL_MS = 1;

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function screenPoint(point: { x: number; y: number }) {
  // Scale the SVG coordinate space into the Paint canvas,
  // preserving proportions and leaving a small margin.
  const usableWidth = CANVAS.width - CANVAS.margin * 2;
  const usableHeight = CANVAS.height - CANVAS.margin * 2;

  const scale = Math.min(
    usableWidth / SOURCE_WIDTH,
    usableHeight / SOURCE_HEIGHT,
  );

  const drawnWidth = SOURCE_WIDTH * scale;
  const drawnHeight = SOURCE_HEIGHT * scale;

  const offsetX = CANVAS.left + (CANVAS.width - drawnWidth) / 2;
  const offsetY = CANVAS.top + (CANVAS.height - drawnHeight) / 2;

  return {
    x: Math.round(
      clamp(offsetX + CANVAS.margin + point.x * scale, SAFE.minX, SAFE.maxX),
    ),
    y: Math.round(
      clamp(offsetY + CANVAS.margin + point.y * scale, SAFE.minY, SAFE.maxY),
    ),
  };
}

// --------------------------------------------------
// Drawing
// --------------------------------------------------

async function main(): Promise<void> {
  console.log(`Generating drawing: ${PROMPT}`);

  const drawing = await generateDrawing(PROMPT);

  console.log(`Description: ${drawing.description}`);
  console.log(`Paths: ${drawing.paths.length}`);

  for (const path of drawing.paths) {
    console.log(`- ${path.name}: ${path.points.length} points`);
  }

  const desktop = new Desktop();

  // Find the already-open Paint application.
  const applications = await desktop.applications();

  const paint = applications.find((app) => /paint/i.test(app.name() ?? ""));

  if (!paint) {
    throw new Error(
      "Paint was not found. Open Paint and make sure its canvas is visible.",
    );
  }

  // The user should leave Paint maximized with a blank canvas visible.
  console.log("Paint found. Switch to Paint and prepare a blank canvas.");
  console.log("Drawing starts in 5 seconds. Do not move the mouse.");

  await sleep(5000);

  let completedPaths = 0;

  for (const path of drawing.paths) {
    if (path.points.length < 2) {
      continue;
    }

    console.log(`Drawing: ${path.name}`);

    const points = path.points.map(screenPoint);

    // Begin a continuous stroke at its first coordinate.
    const first = points[0];

    if (!first) {
      continue;
    }

    paint.mouseClickAndHold(first.x, first.y);

    try {
      let previous = first;

      for (let i = 1; i < points.length; i++) {
        const current = points[i];

        if (!current) {
          continue;
        }

        const dx = current.x - previous.x;
        const dy = current.y - previous.y;
        const distance = Math.hypot(dx, dy);

        const steps = Math.max(1, Math.ceil(distance / PIXELS_PER_STEP));

        for (let step = 1; step <= steps; step++) {
          const x = Math.round(previous.x + (dx * step) / steps);
          const y = Math.round(previous.y + (dy * step) / steps);

          paint.mouseMove(
            clamp(x, SAFE.minX, SAFE.maxX),
            clamp(y, SAFE.minY, SAFE.maxY),
          );

          if (MOVE_INTERVAL_MS > 0) {
            await sleep(MOVE_INTERVAL_MS);
          }
        }

        previous = current;
      }
    } finally {
      // Always release the mouse, even if a movement fails.
      paint.mouseRelease();
    }

    completedPaths++;

    // Brief pause between independent pen strokes.
    await sleep(80);
  }

  console.log(
    `Finished drawing. Completed ${completedPaths}/${drawing.paths.length} paths.`,
  );
}

main().catch((error: unknown) => {
  console.error("Drawing failed:", error);
  process.exitCode = 1;
});
