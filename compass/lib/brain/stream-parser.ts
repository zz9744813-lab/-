export type ParserEvent =
  | { type: 'text'; delta: string }
  | { type: 'action_complete'; actionType: string; payload: unknown }
  | { type: 'action_parse_error'; actionType: string; raw: string; error: string }
  | { type: 'needs_input'; actionType: string; draft: unknown; missing: string[]; ask: string };

export async function* parseBrainStream(chunks: AsyncIterable<string>): AsyncGenerator<ParserEvent> {
  let buffer = '';
  let inAction = false;
  let inNeedsInput = false;
  let currentActionType = '';

  for await (const chunk of chunks) {
    buffer += chunk;
    
    while (buffer.length > 0) {
      if (!inAction && !inNeedsInput) {
        const actionIdx = buffer.indexOf('[[ACTION:');
        const needsInputIdx = buffer.indexOf('[[NEEDS_INPUT:');
        
        const firstIdx = [actionIdx, needsInputIdx].filter(i => i !== -1).sort((a,b)=>a-b)[0];
        
        if (firstIdx !== undefined && firstIdx !== -1) {
          if (firstIdx > 0) {
            yield { type: 'text', delta: buffer.slice(0, firstIdx) };
            buffer = buffer.slice(firstIdx);
            continue;
          }
          
          if (buffer.startsWith('[[ACTION:')) {
            const endBracket = buffer.indexOf(']]');
            if (endBracket !== -1) {
              currentActionType = buffer.slice(9, endBracket).trim();
              buffer = buffer.slice(endBracket + 2);
              inAction = true;
              continue;
            } else {
              break; // wait for more data
            }
          } else if (buffer.startsWith('[[NEEDS_INPUT:')) {
            const endBracket = buffer.indexOf(']]');
            if (endBracket !== -1) {
              currentActionType = buffer.slice(14, endBracket).trim();
              buffer = buffer.slice(endBracket + 2);
              inNeedsInput = true;
              continue;
            } else {
              break; // wait for more data
            }
          }
        } else {
          // No start marker found. Yield up to the last few chars just in case a marker is split
          const safeLen = Math.max(0, buffer.length - 20);
          if (safeLen > 0) {
            yield { type: 'text', delta: buffer.slice(0, safeLen) };
            buffer = buffer.slice(safeLen);
          }
          break;
        }
      } else if (inAction) {
        const endMarker = '[[/ACTION]]';
        const endIdx = buffer.indexOf(endMarker);
        if (endIdx !== -1) {
          const jsonStr = buffer.slice(0, endIdx).trim();
          try {
            const payload = JSON.parse(jsonStr);
            yield { type: 'action_complete', actionType: currentActionType, payload };
          } catch (err: any) {
            yield { type: 'action_parse_error', actionType: currentActionType, raw: jsonStr, error: err.message };
          }
          buffer = buffer.slice(endIdx + endMarker.length);
          inAction = false;
        } else {
          break; // wait for more data
        }
      } else if (inNeedsInput) {
        const endMarker = '[[/NEEDS_INPUT]]';
        const endIdx = buffer.indexOf(endMarker);
        if (endIdx !== -1) {
          const jsonStr = buffer.slice(0, endIdx).trim();
          try {
            const payload = JSON.parse(jsonStr);
            yield { 
              type: 'needs_input', 
              actionType: currentActionType, 
              draft: payload.draft,
              missing: Array.isArray(payload.missing) ? payload.missing : [],
              ask: typeof payload.ask === 'string' ? payload.ask : 'Need more input'
            };
          } catch (err: any) {
            yield { type: 'action_parse_error', actionType: currentActionType, raw: jsonStr, error: err.message };
          }
          buffer = buffer.slice(endIdx + endMarker.length);
          inNeedsInput = false;
        } else {
          break; // wait for more data
        }
      }
    }
  }

  // flush remaining buffer if any
  if (buffer.length > 0 && !inAction && !inNeedsInput) {
    yield { type: 'text', delta: buffer };
  }
}
