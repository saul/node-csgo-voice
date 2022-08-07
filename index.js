var ffi = require("ffi-napi");
var ref = require("ref-napi");
var fs = require("fs");
var WaveFile = require("wavefile").WaveFile;

if (process.argv.length !== 3) {
  console.error(`Format: <input path>`);
  process.exit(1);
}

var CELTMode = ref.types.void;
var CELTModePtr = ref.refType(CELTMode);

var CELTDecoder = ref.types.void;
var CELTDecoderPtr = ref.refType(CELTDecoder);

var vaudio_celt = ffi.Library("vaudio_celt_client", {
  celt_mode_create: [
    CELTModePtr,
    [
      "int", // Fs
      "int", // frame_size
      ref.refType("int"), // error
    ],
  ],
  celt_decoder_create_custom: [
    CELTDecoderPtr,
    [
      CELTModePtr, // mode
      "int", // len
      ref.refType("int"), // error
    ],
  ],
  celt_decode: [
    "int",
    [
      CELTDecoderPtr, // st
      ref.refType(ref.types.uchar), // data
      "int", // len
      ref.refType(ref.types.short), // pcm
      "int", // frame_size
    ],
  ],
});

const SAMPLE_RATE = 22050;
const FRAME_SIZE = 512;

var errorPtr = ref.alloc("int", 0);

var modePtr = vaudio_celt.celt_mode_create(SAMPLE_RATE, FRAME_SIZE, errorPtr);
if (modePtr.isNull()) {
  console.error(`celt_mode_create failed (${errorPtr.deref()})`);
  process.exit(1);
}
var decoderPtr = vaudio_celt.celt_decoder_create_custom(modePtr, 1, errorPtr);
if (decoderPtr.isNull()) {
  console.error(`celt_decoder_create_custom failed (${errorPtr.deref()})`);
  process.exit(1);
}

var infile = process.argv[2];
console.log(`Reading ${infile}...`);

var buffer = fs.readFileSync(infile);
var output = Buffer.alloc((buffer.length / 64) * FRAME_SIZE * 2);

var read = 0;
var written = 0;

while (read < buffer.length) {
  var ret = vaudio_celt.celt_decode(
    decoderPtr,
    buffer.subarray(read),
    64,
    output.subarray(written),
    FRAME_SIZE * 2
  );

  if (ret < 0) {
    console.error(`celt_decode failed (${ret})`);
    continue;
  }

  read += 64;
  written += FRAME_SIZE * 2;

  process.stdout.write(`\rDecoded ${read}/${buffer.length}... `);
}

const outfile = infile + ".wav";
console.log(`\nWriting output to ${outfile}...`);

var wav = new WaveFile();
wav.fromScratch(
  1,
  SAMPLE_RATE,
  "16",
  new Int16Array(output.buffer, output.byteOffset, output.length / 2)
);
fs.writeFileSync(outfile, wav.toBuffer());

console.log(`Done!`);
