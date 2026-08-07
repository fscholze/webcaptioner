import { toast } from 'sonner'
import { VoskSendConfigService } from '../../../../../lib/vosk-config-service'
import { FRONTEND_SEND_TIMESTAMP,FRONTEND_SEND_TIMESTAMP_COUNT } from "../../../../../config";

export const handleSuccess = (
  stream: MediaStream,
  sampleRate: number,
  webSocket: WebSocket,
  chunkLength: number,
  onSetNewProcessor: (processor: AudioWorkletNode) => void,
  onSetNewSource: (source: MediaStreamAudioSourceNode) => void,
  onSetNewContext: (context: AudioContext) => void,
  onStop: () => void,
) => {
  const context = new AudioContext({ sampleRate })
  let count = 0
  context.audioWorklet
    .addModule('worklet/data-conversion-processor.js')
    .then(function () {
      const processor = new AudioWorkletNode(
        context,
        'data-conversion-processor',
        {
          channelCount: 5,
          numberOfInputs: 1,
          numberOfOutputs: 1,
          processorOptions: {
            chunkLength,
          },
        },
      )
      onSetNewProcessor(processor)

      const source = context.createMediaStreamSource(stream)

      source.connect(processor)
      processor.connect(context.destination)

      onSetNewSource(source)
      toast.success('Recording started')
      processor.port.onmessage = event => {
        if (webSocket.readyState === webSocket.OPEN) {
          webSocket.send(event.data)
          if (FRONTEND_SEND_TIMESTAMP === 'true') {
            count += 1
            if (
              count > parseInt(FRONTEND_SEND_TIMESTAMP_COUNT!, 10)
            ) {
              VoskSendConfigService.sendClientTimestamp(
                webSocket,
                new Date().getTime(),
              )
              count = 0
            }
          }
        } else if (webSocket.readyState === webSocket.CLOSED) {
          processor.port.close()
          toast.error('WebSocket connection closed')
          onStop()
        }
      }
      processor.port.start()
    })

  onSetNewContext(context)
}
