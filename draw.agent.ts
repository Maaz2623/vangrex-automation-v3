import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { getLength, getPointAtLength } from "@remotion/paths";

// --------------------------------------------------
// Configuration
// --------------------------------------------------

const MODEL = "gemini-3.5-flash-lite";

// Keep these dimensions aligned with the coordinate space
// already used by your drawing engine.
export const DRAWING_WIDTH = 1000;
export const DRAWING_HEIGHT = 430;

const MAX_PATHS = 100;
const MAX_POINTS_PER_PATH = 180;
const MIN_PATH_LENGTH = 1.5;

const drawingSchema = z.object({
  description: z.string(),
  paths: z.array(
    z.object({
      name: z.string(),
      d: z.string(),
    }),
  ),
});

export type DrawingPoint = {
  x: number;
  y: number;
};

export type DrawingPath = {
  name: string;
  points: DrawingPoint[];
};

export type DrawingResult = {
  description: string;
  paths: DrawingPath[];
};

// --------------------------------------------------
// SVG generation instructions
// --------------------------------------------------

function buildInstructions(prompt: string): string {
  return `
You are a professional vector illustrator creating paths for a real
desktop drawing robot.

Draw this subject: ${prompt}

CANVAS
- Width: ${DRAWING_WIDTH}
- Height: ${DRAWING_HEIGHT}
- Coordinate origin: top-left (0, 0).
- Keep every path inside the canvas.
- Leave approximately 4% margin around the artwork.

STYLE
- Create clean, recognizable black-and-white outline artwork.
- Use smooth, flowing contours instead of jagged polylines.
- Prefer cubic Bézier curves (C) and quadratic Bézier curves (Q).
- Use straight lines only for genuinely straight edges.
- Create anatomically and structurally plausible proportions.
- Avoid random decorative strokes and unnecessary detail.
- Make the silhouette recognizable before adding interior detail.
- Add eyes, facial features, joints, folds, and other defining details
  when appropriate for the requested subject.
- Keep separate strokes separate; do not draw one continuous line
  between unrelated parts.
- Do not create overlapping duplicate outlines.
- Do not use shading, fills, gradients, or colors.
- Do not add text, labels, signatures, or watermarks.

COMPOSITION
1. Plan the major silhouette.
2. Add the major structural forms.
3. Add distinctive features.
4. Add a restrained amount of secondary detail.
5. Ensure the final drawing is balanced and centered.

VECTOR FORMAT
- Return paths as SVG path data strings.
- Use only absolute M, L, C, Q, and Z commands.
- M begins a new stroke.
- L creates a straight segment.
- C creates a cubic Bézier curve.
- Q creates a quadratic Bézier curve.
- Z closes a contour only when it genuinely needs closing.
- Each path must represent one continuous pen stroke.
- Use coordinates in the ${DRAWING_WIDTH} x ${DRAWING_HEIGHT} space.
- Do not return SVG markup, XML, explanations inside path data,
  or coordinates outside the canvas.
- Return enough paths to make the subject recognizable, without
  adding excessive detail.
- Keep path data concise and geometrically meaningful.

The output will be converted into mouse movements, so paths must
be continuous and drawable with a pen. Favor quality of shape over
the number of points.
`.trim();
}

// --------------------------------------------------
// Path conversion
// --------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sampleSvgPath(d: string): DrawingPoint[] {
  const normalized = d.trim();

  if (!normalized || normalized.length > 12_000) {
    return [];
  }

  // Reject commands outside the intentionally supported subset.
  // This prevents unsupported SVG commands from producing surprises.
  if (/[AaHhSsTtVv]/.test(normalized)) {
    throw new Error(
      "The model returned an unsupported SVG command. " +
        "Only M, L, C, Q and Z are supported.",
    );
  }

  if (!/^[MmLlCcQqZz0-9eE+.,\-\s]+$/.test(normalized)) {
    throw new Error("The model returned invalid SVG path characters.");
  }

  const length = getLength(normalized);

  if (!Number.isFinite(length) || length < MIN_PATH_LENGTH) {
    return [];
  }

  // Sample at a fixed spacing to preserve curves without asking
  // the model to emit hundreds of individual coordinates.
  const targetSpacing = 3;
  const sampleCount = Math.max(
    2,
    Math.min(MAX_POINTS_PER_PATH, Math.ceil(length / targetSpacing) + 1),
  );

  const points: DrawingPoint[] = [];

  for (let i = 0; i < sampleCount; i++) {
    const distance = (length * i) / (sampleCount - 1);
    const point = getPointAtLength(normalized, distance);

    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      continue;
    }

    const next: DrawingPoint = {
      x: clamp(point.x, 0, DRAWING_WIDTH),
      y: clamp(point.y, 0, DRAWING_HEIGHT),
    };

    const previous = points[points.length - 1];

    // Remove consecutive duplicate points.
    if (
      previous &&
      Math.abs(previous.x - next.x) < 0.15 &&
      Math.abs(previous.y - next.y) < 0.15
    ) {
      continue;
    }

    points.push(next);
  }

  return points;
}

function validatePaths(
  input: Array<{ name: string; d: string }>,
): DrawingPath[] {
  const output: DrawingPath[] = [];

  for (const path of input.slice(0, MAX_PATHS)) {
    try {
      const points = sampleSvgPath(path.d);

      if (points.length >= 2) {
        output.push({
          name: path.name.trim().slice(0, 80) || "Stroke",
          points,
        });
      }
    } catch (error) {
      // Skip malformed paths instead of crashing the entire drawing.
      console.warn(
        `Skipping invalid path "${path.name}":`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  if (output.length === 0) {
    throw new Error(
      "Gemini returned no usable drawing paths. Try the request again.",
    );
  }

  return output;
}

// --------------------------------------------------
// Public API
// --------------------------------------------------

export async function generateDrawing(prompt: string): Promise<DrawingResult> {
  const cleanedPrompt = prompt.trim();

  if (!cleanedPrompt) {
    throw new Error("Enter something to draw.");
  }

  const { output } = await generateText({
    model: google(MODEL),
    output: Output.object({
      schema: drawingSchema,
    }),
    prompt: buildInstructions(cleanedPrompt),
  });

  if (!output) {
    throw new Error("Gemini did not return a drawing.");
  }

  const paths = validatePaths(output.paths);

  return {
    description: output.description,
    paths,
  };
}
