const palettes = [
  ["#c95445", "#f3c86a", "#2f766f", "#f8efe2"],
  ["#314f54", "#b6573b", "#d9c9a5", "#f7f1e6"],
  ["#5f7d65", "#e2a85b", "#9f4c45", "#fff4ef"],
  ["#273a46", "#d4a24c", "#8bb0aa", "#f3eadb"],
];

const drawScene = (canvas: HTMLCanvasElement, index: number) => {
  const context = canvas.getContext("2d");
  if (!context) return;
  const colors = palettes[index % palettes.length];
  context.fillStyle = colors[3];
  context.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.52, colors[2]);
  gradient.addColorStop(1, colors[1]);
  context.fillStyle = gradient;
  context.fillRect(80, 110, canvas.width - 160, canvas.height - 220);

  context.fillStyle = "rgba(255, 250, 238, 0.84)";
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const width = 120 + ((row + col + index) % 3) * 38;
      const height = 80 + ((row * col + index) % 4) * 28;
      context.fillRect(140 + col * 230, 190 + row * 250, width, height);
    }
  }

  context.fillStyle = "rgba(38, 29, 26, 0.72)";
  context.font = "800 96px system-ui, sans-serif";
  context.fillText(`DAY ${index + 1}`, 150, 1380);
  context.font = "600 38px system-ui, sans-serif";
  context.fillText(["CITY WALK", "SUNSET ROUTE", "SLOW TABLE", "QUIET MAP"][index % 4], 154, 1444);
};

export const createSampleFiles = async () => {
  const files: File[] = [];
  for (let index = 0; index < 4; index += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = index % 2 === 0 ? 1200 : 1600;
    canvas.height = index % 2 === 0 ? 1600 : 1200;
    drawScene(canvas, index);
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((value) => resolve(value ?? new Blob()), "image/jpeg", 0.92);
    });
    files.push(new File([blob], `sample-journal-${index + 1}.jpg`, { type: "image/jpeg" }));
  }
  return files;
};
