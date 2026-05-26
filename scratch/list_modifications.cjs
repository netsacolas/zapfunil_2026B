const fs = require('fs');
const path = require('path');

const transcriptPath = 'C:\\Users\\mario\\.gemini\\antigravity-ide\\brain\\583704ef-801c-4d20-963d-98ad5213003b\\.system_generated\\logs\\transcript.jsonl';

const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

const modifications = [];

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const data = JSON.parse(line);
    if (data.tool_calls) {
      for (const call of data.tool_calls) {
        if (call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') {
          modifications.push({
            step: data.step_index,
            created_at: data.created_at,
            tool: call.name,
            file: call.args.TargetFile || call.args.targetFile,
            description: call.args.Description || call.args.description,
            instruction: call.args.Instruction || call.args.instruction
          });
        }
      }
    }
  } catch (e) {
    // Ignore JSON parse errors
  }
}

console.log(JSON.stringify(modifications, null, 2));
