# Browser media compatibility for user-uploaded attachments (WhatsApp voice notes, phone videos, in-browser recording)

Research note (2026-11-24). Many primary pages (caniuse.com, developer.mozilla.org, docs.aws.amazon.com page bodies, blog.addpipe.com, frequal.com) could not be fetched from this session because those hosts are outside the network allowlist. Findings come from web search excerpts plus Apple's Safari 18.4 release notes, which were fetched in full. Unverified items are flagged.

## Summary compatibility matrix (synthesized; see sections below for citations)

| Format | Chrome / Edge (desktop) | Android Chrome | Firefox | Safari macOS | iOS Safari (all iOS browsers use WebKit) |
|---|---|---|---|---|---|
| MP3 | Yes | Yes | Yes | Yes | Yes |
| AAC in .m4a/.mp4 | Yes | Yes | Yes (uses OS decoders) | Yes | Yes |
| Ogg Opus (.ogg/.opus) | Yes | Yes | Yes | Yes from Safari 18.4 (macOS 15.4) | Yes from iOS 18.4 (Mar 2025); **no on iOS <= 18.3** |
| WebM Opus | Yes | Yes | Yes | Yes (macOS, since ~Safari 15/16) | Inconsistent historically on iOS/iPadOS; better in 17/18 |
| MP4 H.264 + AAC | Yes | Yes | Yes | Yes | Yes |
| MOV (QuickTime) H.264 | Usually plays (same codecs as MP4), not guaranteed | Usually | Usually | Yes | Yes |
| MOV/MP4 HEVC (iPhone default "High Efficiency") | Only with HW decoder (Chrome 107+); Windows also needs the HEVC Video Extensions | Only with HW decoder (Android 5/6+) | Windows 134+, macOS 136+, Linux 137+ (forum report); depends on OS codec | Yes | Yes |

**Bottom line:** Server-side transcoding is needed for video (HEVC .mov from iPhones is not reliably playable on Windows/Android/Firefox). For audio, Ogg Opus now plays everywhere current, but iOS before 18.4 cannot play it, and in-browser recordings come in three different containers, so normalizing to AAC .m4a is the safe choice. Keep the original file.

## WhatsApp voice notes: container/codec, extension, and MIME on Android vs iOS export

### Takeaway
WhatsApp voice notes are Opus audio in an Ogg container, mono, typically 16 kHz input at about 16 kbps. Exports from both Android and iOS carry a `.opus` extension, with different filename patterns (`PTT-YYYYMMDD-WA####.opus` on Android, `########-AUDIO-YYYY-MM-DD-HH-MM-SS.opus` on iOS).

### Cited Findings
- Meta's WhatsApp Business Platform requires voice messages to be `.ogg` files encoded with the OPUS codec, MIME type `audio/ogg` (Opus only), mono input — [Meta WhatsApp Business Platform: audio messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/audio-messages)
- A whatsmeow developer reports the phone app is strict: the file "must absolutely be an ogg container with the opus compression at 16 kHz and exactly one channel" — [tulir/whatsmeow issue #517](https://www.github.com/tulir/whatsmeow/issues/517)
- An FFmpeg-user thread inspecting a real WhatsApp voice note shows Opus, 1 channel, 16 kHz. A commenter suggests WhatsApp may be picky about VBR mode, which is unconfirmed — [ffmpeg-user, July 2019](https://ffmpeg.org/pipermail/ffmpeg-user/2019-July/044853.html)
- A blog analysis reports 16 kHz mono at about 16 kbps (secondary source) — [DEV Community: transcribe WhatsApp voice notes](https://dev.to/chattopdf/transcribe-whatsapp-audio-voice-notes-to-text-pdf-2026-1me)
- Opus timestamps run at 48 kHz regardless of input rate, so "16 kHz" describes the input/bandwidth, and decoders output 48 kHz — [Wikipedia: Opus](https://www.wikipedia.com/wiki/.opus)
- Export filenames: Android `PTT-20260115-WA0001.opus` (chat.txt line "PTT-20260115-WA0001.opus (file attached)"); iOS `00000042-AUDIO-2026-01-15-14-23-01.opus`, referenced in `_chat.txt` as `<attached: 00000012-AUDIO-2024-03-15-09-22-31.opus>` — [DEV Community](https://dev.to/chattopdf/transcribe-whatsapp-audio-voice-notes-to-text-pdf-2026-1me); [generalistprogrammer tutorial](https://generalistprogrammer.com/tutorials/transcribe-whatsapp-audio-nodejs)
- On-device Android storage is under `.../com.whatsapp/WhatsApp/Media/WhatsApp Voice Notes`. Media is exported only when the user picks "include media" — [androidayuda](https://en.androidayuda.com/applications/Tutorials/they-save-whatsapp-audios/); [Wondershare MobileTrans](https://mobiletrans.wondershare.com/mobile-whatsapp-manage/how-to-find-whatsapp-voice-notes.html)

### Inferences
- `.opus` files are Ogg Opus, so the correct MIME type to store and serve is `audio/ogg; codecs=opus` (or `audio/ogg`). Browsers' `File.type` for `.opus` uploads is unreliable (it may be empty or `audio/opus`), so detect server-side from magic bytes (`OggS` + `OpusHead`) or with ffprobe rather than trusting the client MIME type.
- Voice notes are tiny (about 120 KB per minute at 16 kbps), so transcoding them is cheap.

### Gaps
- No official WhatsApp FAQ documents the sample rate or export filenames; these come from community sources. I found no authoritative statement on what `File.type` each browser reports for `.opus`.

## Playback support (2026) for Ogg Opus, M4A/AAC, MP3, WebM Opus

### Takeaway
Apple added Ogg Opus and Ogg Vorbis playback in Safari 18.4 (iOS/iPadOS 18.4, macOS 15.4, released 2025-03-31). Every current browser now plays Ogg Opus, but devices stuck on iOS 18.3 or earlier cannot. AAC (.m4a) and MP3 play universally.

### Cited Findings
- Safari 18.4 release notes, Media: "Added support for Ogg Opus and Ogg Vorbis on macOS Sequoia 15.4, iOS 18.4, iPadOS 18.4, and visionOS 2.4." and "Added WebM support to MediaRecorder." Released March 31, 2025. Safari 18.4 also ships on macOS Sonoma/Ventura, but the Ogg note names only Sequoia 15.4 — [Apple: Safari 18.4 Release Notes](https://developer.apple.com/documentation/safari-release-notes/safari-18_4-release-notes)
- A developer reports that Ogg Opus *recording* through MediaRecorder still fails in Safari 18.4, even though playback was added — [frequal.com: Ogg Opus still not working in Safari 18.4](https://frequal.com/java/OggOpusStillNotWorkingInSafari18_4.html) (search excerpt only)
- Gadget Hacks: Safari 18.4 plays Ogg Opus and Ogg Vorbis in `<audio>` and direct links; Speex and Theora remain unsupported — [Gadget Hacks](https://apple.gadgethacks.com/how-to/safari-18-4-hidden-web-features)
- Historical WebKit bugs: WebM Opus worked on macOS Safari, but on iPadOS `canPlayType()` returned false and `<audio>` failed (2022). A Safari 16 blob-URL WebM Opus bug also existed — [WebKit bug 238546](https://bugs.webkit.org/show_bug.cgi?id=238546); [WebKit bug 245428](https://bugs.webkit.org/show_bug.cgi?id=245428); [WebKit bug 176650](https://bugs.webkit.org/show_bug.cgi?id=176650)
- Plex web transcodes Opus to AAC for browser clients, a common industry practice — [Plex forum](https://forums.plex.tv/t/plex-web-transcoding-opus-audio-to-aac/868718)

### Inferences
- Chrome, Edge, Firefox and Android Chrome have played Ogg Opus, WebM Opus, MP3 and AAC/M4A for years. This is well established, but I could not fetch caniuse/MDN to cite exact versions.
- The installed base on iOS < 18.4 is shrinking by late 2026 but not zero, especially on older iPhones that can't upgrade. Serving an AAC .m4a rendition removes this risk at negligible cost.
- Use `audio.canPlayType('audio/ogg; codecs=opus')` client-side to choose the original or the AAC rendition if both exist.

### Gaps
- Could not fetch caniuse.com/opus or MDN's codec tables (host blocked) to cite exact Chrome/Firefox/Edge version numbers.

## Video: iPhone .mov (HEVC vs H.264), playback on Windows/Android; MP4 H.264; Chrome HEVC since 107

### Takeaway
iPhones record HEVC in a .mov container by default ("High Efficiency"). That plays in Safari, but in Chrome/Edge/Firefox it only plays when the OS exposes a hardware HEVC decoder (and on Windows, the HEVC Video Extensions). H.264/AAC in MP4 is the only universally safe target.

### Cited Findings
- Chrome 107 shipped hardware-accelerated HEVC decoding on platforms with HW decode: Android 5+ (another source says 6.0+), macOS 11+, select ChromeOS and Windows devices; Linux followed in 108 — [Android Police](https://www.androidpolice.com/google-chrome-107/); [Winaero](https://winaero.com/google-released-chrome-107-will-soon-drop-windows-8-1-and-7-support); [StaZhu/enable-chromium-hevc-hardware-decoding](https://fr.github.com/StaZhu/enable-chromium-hevc-hardware-decoding)
- Chrome on Windows needs supported GPU hardware and the HEVC Video Extensions; some Intel iGPUs have HEVC disabled — [winxdvd guide](https://www.winxdvd.com/video-transcoder/hevc-chrome.htm); [Plex forum](https://forums.plex.tv/t/updating-chrome-profile-for-hevc-chrome-107/816329); [Jellyfin forum](https://forum.jellyfin.org/printthread.php?tid=7830)
- Firefox HEVC: Mozilla planned hardware HEVC on by default around Fx133. A forum summary says Windows 134+, macOS 136+, Linux 137+. It depends on Windows Media Foundation, so users without HEVC support need the Microsoft Store HEVC extension — [Mozilla bug 1963910](https://bugzilla.mozilla.org/show_bug.cgi?id=1963910); [Jellyfin forum: Firefox 137 HEVC on Linux](https://forum.jellyfin.org/t-firefox-137-0-now-supports-hevc-playback-on-linux?pid=56890); [Mozilla support](https://support.mozilla.org/en-US/questions/1500336)
- Real-world reports: iPhone .mov uploads "do not play in a Chrome or Firefox browser. It works in Safari"; another user found Windows Chrome plays iPhone 16 MOVs while Ubuntu Chrome does not — [Discourse meta](https://meta.discourse.org/t/iphone-video-mov-does-not-play-in-chrome-or-ff/163572); [Nextcloud forum](https://help.nextcloud.com/t/unable-to-play-and-preview-mov-files-works-on-ios-nextcloud-client-though/148496)
- Setting iPhone Settings > Camera > Formats > "Most Compatible" records H.264; converting MOV to MP4 is the common fix — [Wondershare guide](https://mobiletrans.wondershare.com/iphone/how-to-fix-iphone-hevc-videos-not-playing-windows.html)
- iPhone video recorded in HDR (Dolby Vision HEVC, default on recent iPhones) is not covered by these sources; see Gaps.

### Inferences
- Even when HEVC decodes, Chrome/Firefox may not handle the `video/quicktime` MIME type or MOV-specific atoms consistently. Remuxing or transcoding to `.mp4` with `video/mp4` avoids both problems.
- Android phone videos are usually H.264 or HEVC MP4. HEVC Android clips have the same risk on desktop browsers without HW decode.
- Transcode every uploaded video to H.264 High profile + AAC MP4 with faststart. Optionally skip re-encoding (remux only, `-c copy`) when ffprobe shows the input is already H.264/AAC, which is much faster.

### Gaps
- No primary Chrome/Microsoft doc fetched on Edge HEVC specifics. HDR/Dolby Vision tone-mapping behavior when transcoding iPhone HDR to SDR H.264 was not researched (it needs a tone-map filter, or output looks washed out).

## MediaRecorder: supported mimeTypes per browser, isTypeSupported strategy, duration concerns

### Takeaway
Each engine records natively in a different container. Chrome uses WebM/Opus by default and can produce MP4 since about Chrome 126. Firefox uses Ogg/Opus for audio and WebM for video. Safari uses MP4/AAC, with WebM added in 18.4, but not Ogg. Pick the first type from a preference list that passes `MediaRecorder.isTypeSupported()`, and normalize server-side.

### Cited Findings
- MediaRecorder availability: Chrome 49+, Edge 79+, Firefox 29+, Safari 14.1+ (macOS) / 14.5+ (iOS) — [TestMu/LambdaTest MediaRecorder page](https://www.testmuai.com/web-technologies/mediarecorder/)
- Safari 18.4 "Added WebM support to MediaRecorder" — [Apple: Safari 18.4 Release Notes](https://developer.apple.com/documentation/safari-release-notes/safari-18_4-release-notes)
- Safari MediaRecorder historically produces MP4 (H.264/AAC). Example candidate list: `audio/mp4;codecs=mp4a.40.2` (Safari 14.1–18.3), `audio/ogg;codecs=opus` (Firefox) — [TestMu MediaRecorder](https://www.testmuai.com/web-technologies/mediarecorder/)
- Ogg Opus recording via MediaRecorder fails on Safari 18.4 — [frequal.com](https://frequal.com/java/OggOpusStillNotWorkingInSafari18_4.html)
- Chrome added MP4 container support to MediaRecorder in Chrome 126 (June 2024): H.264 (avc1) + AAC (mp4a.40.2), feature-detected with `isTypeSupported("video/mp4;codecs=avc1,mp4a.40.2")`. H.264/AAC depend on OS encoders, and MP4 can also carry VP9/Opus — [blink-dev Intent to Ship: MP4 for MediaRecorder](https://groups.google.com/a/chromium.org/g/blink-dev/c/p1OMVj1FrMI); [addpipe MediaRecorder demo](https://addpipe.com/media-recorder-api-demo/)
- Chromium M130 added HEVC platform encoding to WebCodecs, then to MediaRecorder (MP4 and Matroska) — [blink-dev Intent to Ship: H26x for MediaRecorder](https://groups.google.com/a/chromium.org/g/blink-dev/c/YJ1QijNiHeM)
- A DEV post claims "Chrome 130+ records MP4 natively", which conflicts with the 126 date above — [DEV Community](https://dev.to/alexneamtu/how-we-made-screen-recording-work-on-every-browser-g72)
- Firefox writes `audio/ogg;codecs=opus` and defaults to WebM/VP8 for video. Chromium does not write Ogg — [TestMu](https://www.testmuai.com/web-technologies/mediarecorder/); [Mozilla bug 1631143](https://bugzilla.mozilla.org/show_bug.cgi?id=1631143)
- `isTypeSupported()` only means the type is recordable. Recording may still fail if resources are insufficient — [MDN isTypeSupported](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static) (via search excerpt)
- Chrome WebM recordings lack Duration metadata (present since Chrome 140 in non-chunked recordings) and lack Cues (the seek index), so seeking is broken or slow. Chunked (timeslice) recordings lack both. Fixes are `fix-webm-duration` (client), `webm-metainfo-fix` (adds Cues/SeekHead), or an ffmpeg remux server-side — [addpipe: Duration in WebM produced by Chrome](https://blog.addpipe.com/duration-in-webm-videos-produced-by-chrome/); [yusitnikov/fix-webm-duration](https://github.com/yusitnikov/fix-webm-duration); [Remotion: fix MediaRecorder video](https://remotion.dev/docs/webcodecs/fix-mediarecorder-video)
- MP4 files from Chrome and Safari MediaRecorder also have duration quirks — [addpipe: Duration in MP4 files by Chrome and Safari](https://blog.addpipe.com/duration-in-mp4-files-produced-by-chrome-safari/)

### Inferences
- Recommended preference list for voice recording: `['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus', '']`. Preferring MP4/AAC gives directly playable output on Safari and on Chrome 126+ where an OS AAC encoder exists. Otherwise WebM/Opus, then Ogg (Firefox). Always record `recorder.mimeType` and upload it as metadata, and remux or transcode server-side to fix duration and seeking.
- Max duration: there is no hard spec limit, but blobs accumulate in memory. Use `start(timeslice)` (for example 1000 ms), cap recording length in the UI (for example 10–15 min for voice notes), and stop on `visibilitychange`, because iOS suspends background tabs/mics. Chunked uploads (multipart) let very long recordings stream.
- Track duration with a client timer and send it alongside the file, because the container duration can't be trusted until server-side probe/remux.

### Gaps
- Could not fetch MDN/addpipe pages directly for an authoritative per-version table. The iOS background-recording behavior is general knowledge and was not cited.

## Transcoding: ffmpeg targets, thumbnails, duration probing, waveforms, S3 + worker architecture, cost/time for 100 MB

### Takeaway
Yes, transcode. Store the original plus normalized renditions: AAC .m4a for all audio, H.264/AAC MP4 with `+faststart` for all video, a JPEG poster, ffprobe metadata, and audiowaveform JSON peaks. Run it in an S3-event-triggered background worker (ffmpeg on ECS/Fargate or a container, or Lambda for short audio) or use AWS Elemental MediaConvert for video.

### Cited Findings
- BBC `audiowaveform` generates waveform data as binary `.dat` or JSON, or a PNG. For peaks.js use 8-bit: `audiowaveform -i in.mp3 -o out.json -b 8 -z 256` — [bbc/audiowaveform](https://www.github.com/bbc/audiowaveform); [bbc/peaks.js](https://github.com/bbc/peaks.js); [bbc/waveform-data.js](https://github.com/bbc/waveform-data.js)
- audiowaveform reads WAV/MP3 (and other formats in newer builds), so converting Opus to WAV/MP3 first via ffmpeg is a safe pipeline step — [bbc/audiowaveform](https://www.github.com/bbc/audiowaveform)
- MediaConvert bills per output minute with multipliers by tier/resolution/codec/frame rate, with volume discounts. Rates start at about $0.0075/min — [AWS MediaConvert pricing](https://aws.amazon.com/mediaconvert/pricing); [AWS blog: tiered pricing](https://aws.amazon.com/blogs/media/optimize-costs-with-tiered-pricing-in-aws-elemental-mediaconvert); [AWS: Elastic Transcoder ending](https://aws.amazon.com/blogs/media/support-for-amazon-elastic-transcoder-ending-soon)
- Elastic Transcoder support is ending; MediaConvert is the AWS replacement — [AWS blog](https://aws.amazon.com/blogs/media/support-for-amazon-elastic-transcoder-ending-soon)
- ffmpeg server-side remux moves metadata/seek info to the front for MediaRecorder output — [Remotion](https://remotion.dev/docs/webcodecs/fix-mediarecorder-video)

### Inferences (standard ffmpeg practice; not individually cited)
- Audio to AAC m4a (voice): `ffmpeg -i in -vn -ac 1 -ar 48000 -c:a aac -b:a 64k -movflags +faststart out.m4a`. Use 96–128k stereo for music.
- Video to H.264/AAC MP4: `ffmpeg -i in.mov -map 0:v:0 -map 0:a:0? -c:v libx264 -preset veryfast -crf 23 -profile:v high -pix_fmt yuv420p -vf "scale='min(1920,iw)':-2" -c:a aac -b:a 128k -movflags +faststart out.mp4`. `yuv420p` handles 10-bit HDR iPhone input; for HDR add a `zscale`/`tonemap` chain. ffmpeg applies the rotation metadata by default (autorotate).
- Fast path: if ffprobe shows h264 + aac, do `-c copy -movflags +faststart` (seconds, not minutes).
- Poster: `ffmpeg -ss 1 -i in -frames:v 1 -vf "scale=640:-2" poster.jpg` (fall back to `-ss 0` for clips under 1 s).
- Probe: `ffprobe -v error -show_format -show_streams -of json in`, reading duration, codec_name, width/height and rotation side data.
- Architecture: browser uploads the original to `s3://bucket/originals/{id}` via presign. S3 ObjectCreated triggers SQS, then a worker (ECS Fargate/EC2 container with ffmpeg + audiowaveform; Lambda works for audio and short clips but has a 15-min/10 GB-ephemeral limit) writes `renditions/{id}/play.mp4|m4a`, `poster.jpg`, `peaks.json` and updates DB status (`processing` -> `ready`/`failed`). The UI plays the original if `canPlayType` succeeds while processing, else shows "processing".
- Time/cost for 100 MB: a 100 MB iPhone HEVC clip is about 1–2 min of 1080p/4K. x264 `veryfast` at 1080p on 2–4 vCPU runs at roughly 1–3x realtime, so about 1–3 min of compute. Fargate at about $0.04/vCPU-hr makes that fractions of a cent per file. MediaConvert at about $0.0075–0.015/output-min costs about $0.01–0.03 per clip. Voice notes take under 1 s each. Treat these as order-of-magnitude estimates, not benchmarks.

### Gaps
- Could not fetch the MediaConvert pricing page body for exact per-minute rates by resolution, or current Fargate/Lambda prices. No benchmark source for x264 speed on Fargate was found. The ffmpeg commands are standard but uncited (ffmpeg.org was not fetched).

## Direct-to-S3 uploads for 100 MB files: presigned PUT vs multipart, CORS, Safari quirks

### Takeaway
A single presigned PUT handles 100 MB fine (the limit is 5 GB). Multipart (5 MiB–5 GiB parts, max 10,000) adds resumability, parallelism and retry per part, which is worth it on mobile networks. Either way, configure bucket CORS to allow PUT from your origin and expose `ETag`.

### Cited Findings
- S3 multipart limits: up to 10,000 parts; part size 5 MiB to 5 GiB (last part has no minimum); max object 48.8 TiB — [AWS S3 multipart upload limits](https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html)
- Largest single request size for any S3 upload API is 5 GB — [AWS S3 directory bucket append docs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-buckets-objects-append.html); [Filebase: browser uploads with presigned URLs](https://filebase.com/blog/how-browser-uploads-work-with-pre-signed-s3-urls/)
- The browser can only read the `ETag` response header (needed to call CompleteMultipartUpload) if the bucket CORS lists `ETag` in `ExposeHeaders`; `AllowedMethods` must include PUT — [AWS SDK for JS v3: CORS](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/cors.html); [Encore: S3 multipart upload](https://encore.dev/articles/s3-multipart-upload); [DEV: multipart + presigned URLs](https://dev.to/magpys/upload-large-files-to-aws-s3-using-multipart-upload-and-presigned-urls-4olo)
- A presigned URL that works in Postman but fails in the browser is almost always bucket CORS — [AnswerOverflow thread](https://www.answeroverflow.com/m/1026190531056902184); [OneUptime: fix S3 CORS errors](https://oneuptime.com/blog/post/2026-02-12-fix-s3-cors-errors-web-applications/view)
- Uppy's `@uppy/aws-s3` handles presigned multipart from the browser (sign parts server-side, complete server-side) — [Uppy AWS S3 multipart docs](https://uppy.io/docs/aws-s3-multipart)

### Inferences
- Sample CORS: `AllowedOrigins: [https://app.example.com]`, `AllowedMethods: [PUT, GET, HEAD]`, `AllowedHeaders: [*]` (or explicitly `Content-Type`, `x-amz-*`), `ExposeHeaders: [ETag]`, `MaxAgeSeconds: 3000`.
- The `Content-Type` sent by the browser must match what was signed into the presigned PUT, or S3 returns 403 SignatureDoesNotMatch. Safari/iOS often reports an empty or unexpected `File.type` for `.opus`/`.mov`, so the server should decide the Content-Type (or omit it from the signature) and validate by sniffing after upload.
- Safari quirks (general knowledge, uncited): iOS Safari may stop uploads when the tab is backgrounded or the screen locks, which is a strong argument for multipart with per-part retry for 100 MB files on mobile. iOS "Photos" picks of HEVC video may be transcoded by iOS to H.264 when `accept` lacks `video/quicktime`/HEVC hints, which is unreliable and should not be relied on. Use XHR (not fetch) for upload progress events, since fetch upload progress is not broadly supported.
- Recommendation: use multipart (for example 10 MiB parts, 3–4 concurrent) for files over about 20 MB and a single presigned PUT below that, or multipart everywhere via Uppy for simplicity. Add an S3 lifecycle rule to abort incomplete multipart uploads after 1–7 days.

### Gaps
- No primary source found for Safari-specific presigned-upload bugs or for iOS transcoding-on-pick behavior. Those claims are unverified. The AWS docs pages were cited from search excerpts; page bodies were not fetchable here.
