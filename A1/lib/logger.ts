const LOG_FILE_PATH = "logs/ai_response.log";

export default async function logger(
  version: string,
  model_name: string,
  prompt:string
) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] | [${model_name}] | [${version}] | [${prompt}]\n\n`

  try { 
    const file = Bun.file(LOG_FILE_PATH);
    const existingContent = await file.exists() ? await file.text() : '';

    await Bun.write(LOG_FILE_PATH, existingContent + logLine);
  } catch (err) {
    console.error(err)
  }
}