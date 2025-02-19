# dataflow

## frontend (webcaptioner-ng)

* src/features/main-screen/components/audio-recorder/handler/handle-success.ts

```code

webSocket.send(`${new Date().getTime()}`)

```

	* returns the number of milliseconds since January 1, 1970 00:00:00

## backend (webcaptioner-ng-server)

* src/index.ts

```code

      if (message.length === 13) {
        const time = parseInt(message, 10)
        const timeStatus = `seconds=${Math.trunc(time / 1000)},milli=${
          time - Math.trunc(time / 1000) * 1000
        }`

        webSocket.send(timeStatus)

```

	* send a formatted message with the same timestamp separated into seconds + milliseconds to recognizer container

## recognizer (vosk)

* vosk-server/websocket-cpp/asr_server.cpp

```code

        		std::cout << "msglen=" << len << "msg=" << buf << "\n";
        		// need a parser for this string: "seconds=XXXX,milli=YYYY"
        		struct timeval tv;
        		std::regex pattern("(seconds)=(\\d+),(milli)=(\\d+)");
        		std::smatch matches;
        		std::string bufToMatch = std::string(buf, len);
        		if (std::regex_match(bufToMatch, matches, pattern)) 
        		{
        			tv.tv_sec = std::stoi(matches[2].str());
        			tv.tv_usec = std::stoi(matches[4].str()) * 1000;
        			vosk_recognizer_set_timestamp(rec_, &tv);
        		}

```

	* converts seconds and milliseconds into a struct timeval (seconds / microseconds)

* docker_vosk/common/vosk_api_wrapper.cpp

```code

void vosk_recognizer_set_timestamp(VoskRecognizer *recognizer, struct timeval *timestamp)
{
	
#ifdef VERBOSE_API_USAGE
	printf("vosk_recognizer_set_timestamp, seconds=%ld, uSeconds=%ld.\n", recognizer->getInstanceId(), timestamp->tv_sec, timestamp->tv_usec);
#endif

	recognizer->setTimeStamp((int64_t) timestamp->tv_sec, (int64_t) timestamp->tv_usec);
}

```

	* extract seconds and microseconds from struct and forward as individual numbers

* docker_vosk/vosk_server_recikts/VoskRecognizer.cpp


```code

	clientTimeStamp = std::chrono::system_clock::from_time_t(seconds) + std::chrono::microseconds(uSeconds);
	auto timeStampPrint = std::chrono::system_clock::to_time_t(clientTimeStamp);
	std::cout << "TIMESTAMP: " << std::ctime(&timeStampPrint) << std::endl;


```

	* generates a std::chrono::time_point from the seconds, adds the microseconds to it afterwards
	
* docker_vosk/common/VADWrapper.cpp

```code

		std::chrono::time_point<std::chrono::system_clock> timeStampStart = chunks[chunkUttStart]->currFrameTime;
	
		uStartTime   = std::chrono::duration_cast<std::chrono::seconds>(timeStampStart.time_since_epoch()).count();
		uStartTimeMs = std::chrono::duration_cast<std::chrono::milliseconds>(timeStampStart.time_since_epoch()).count() - (uStartTime * 1000);

```

	* remember start of utterance seconds + milliseconds
	
* docker_vosk/vosk_server_recikts/VoskRecognizer.cpp


```code

		std::unique_ptr<FinalResult> fin = std::move(finalResults.front());
		finalResults.pop_front();
		res += fin->text;
		
		uStartTime   = fin->uStartTime;
		uStartTimeMs = fin->uStartTimeMs;
		uStopTime    = fin->uStopTime;
		uStopTimeMs  = fin->uStopTimeMs;

```

	* put values into JSON message towards backend container
	
## backend (webcaptioner-ng-server)

* src/index.ts

```code

  webSocket.onmessage = event => ws.send(event.data)

```

	* send responses from recognizer (vosk) container directly back to frontend
	
## frontend (webcaptioner-ng)

* src/helper/vosk.ts

```code

export const typedVoskResponse = (data: any): VOSKResponse => {
  const typed = JSON.parse(data)
  typed.listen = typed.listen === 'true'
  const startMs = typed.startMs ? ('000' + typed.startMs).slice(-3) : '000'
  const stopMs = typed.stopMs ? ('000' + typed.stopMs).slice(-3) : '000'
  typed.start = typed.start ? parseInt(`${typed.start}${startMs}`) : undefined
  typed.stop = typed.stop ? parseInt(`${typed.stop}${stopMs}`) : undefined


```

	* parse JSON response from vosk and construct start/stop values as milliseconds numbers, padded with zeros

* src/features/main-screen/index.tsx

```code

            const youtubePackages = createYoutubePackages(trimmedText, {
              start: parsed.start ? new Date(parsed.start) : new Date(),
              stop: parsed.stop ? new Date(parsed.stop) : new Date(),
            })

```

	* create a Date object from the milliseconds value
	
```code

              const youtubeData = await getParseDataForYoutube(
                seq,
                youtubePackage.text,
                dayjs(youtubePackage.date)
                  .add(timeOffsetRef.current, 'seconds')
                  .toDate(),
                youtubeSettings.streamingKey
              )

```

	* apply offset in seconds to Date object
	
* src/lib/server-manager.ts

```code

  const data = {
    cid: youtubeStreamingKey,
    seq: seq,
    timestamp: date.toISOString(),
    region: region,
    text: text,
  }

```

	* stringify date object
	* The standard is called ISO-8601 and the format is: YYYY-MM-DDTHH:mm:ss.sssZ
	

```code

  return axios
    .request(config)
    .then((res) => {
      console.log(res)
      return {
        seq,
        text: data.text,
        timestamp: new Date(res.data.split('\n')[0] + '+00:00'),
        successfull: true,
      }
    })
	
```

	* send data to backend (and return result message)
	
## backend (webcaptioner-ng-server)

* src/routes/youtube.ts

```code

  const parsedDate = dayjs
    .utc(params.timestamp)
    .format('YYYY-MM-DDTHH:mm:ss.SSS')


```

	* parse timestamp as UTC and re-format for youtube
	
	
