const fs = require('fs');
const transcriptPath = 'C:\\Users\\mario\\.gemini\\antigravity-ide\\brain\\583704ef-801c-4d20-963d-98ad5213003b\\.system_generated\\logs\\transcript.jsonl';

const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const data = JSON.parse(line);
    if (data.tool_calls) {
      for (const call of data.tool_calls) {
        if (call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') {
          console.log(`=== Step ${data.step_index} | File: ${call.args.TargetFile || call.args.targetFile} ===`);
          if (call.name === 'replace_file_content') {
            console.log(`Target Content:\n${call.args.TargetContent || call.args.targetContent}`);
            console.log(`Replacement Content:\n${call.args.ReplacementContent || call.args.replacementContent}`);
          } else {
            const chunks = call.args.ReplacementChunks || call.args.replacementChunks || [];
            chunks.forEach((chunk, i) => {
              console.log(`Chunk ${i}:`);
              console.log(`Target:\n${chunk.TargetContent || chunk.targetContent}`);
              console.log(`Replacement:\n${chunk.ReplacementContent || chunk.replacementContent}`);
            });
          }
          console.log('\n');
        }
      }
    }
  } catch (e) {}
}
