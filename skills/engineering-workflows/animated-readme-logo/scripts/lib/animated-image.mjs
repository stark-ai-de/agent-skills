import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
} from "node:fs";

export const DEFAULT_ANIMATED_IMAGE_LIMITS = Object.freeze({
  maxFileBytes: 20 * 1024 * 1024,
  maxChunkBytes: 8 * 1024 * 1024,
  maxFrames: 1_000,
  maxDimension: 16_384,
  maxPixels: 64_000_000,
  maxChunks: 10_000,
});

export class AnimatedImageError extends Error {
  constructor(code, message, category = "validation") {
    super(message);
    this.name = "AnimatedImageError";
    this.code = code;
    this.category = category;
  }
}

function fail(code, message, category) {
  throw new AnimatedImageError(code, message, category);
}

function normalizeLimits(options = {}) {
  const limits = { ...DEFAULT_ANIMATED_IMAGE_LIMITS, ...options };
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      fail("INVALID_LIMIT", `${name} must be a positive safe integer`, "usage");
    }
  }
  return limits;
}

function requireBytes(buffer, offset, length, context) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || length < 0) {
    fail("INTERNAL_BOUNDS_ERROR", `invalid parser bounds for ${context}`);
  }
  if (offset < 0 || offset + length > buffer.length) {
    fail("TRUNCATED_FILE", `${context} is truncated at byte ${offset}`);
  }
}

function assertCanvas(width, height, limits, context) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
    fail("INVALID_DIMENSIONS", `${context} dimensions must be positive integers`);
  }
  if (
    width > limits.maxDimension ||
    height > limits.maxDimension ||
    width * height > limits.maxPixels
  ) {
    fail("DIMENSION_LIMIT", `${context} dimensions exceed configured limits`);
  }
}

function loopLabel(loopCount) {
  if (loopCount === null) return "unspecified";
  return loopCount === 0 ? "infinite" : loopCount;
}

function result(format, width, height, frameCount, loopCount) {
  return {
    format,
    width,
    height,
    frameCount,
    animated: frameCount > 1,
    loopCount,
    loop: loopLabel(loopCount),
  };
}

function inspectGif(buffer, limits) {
  requireBytes(buffer, 0, 13, "GIF header");
  const signature = buffer.toString("ascii", 0, 6);
  if (signature !== "GIF87a" && signature !== "GIF89a") {
    fail("INVALID_GIF_SIGNATURE", "GIF signature must be GIF87a or GIF89a");
  }
  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  assertCanvas(width, height, limits, "GIF canvas");
  const logicalPacked = buffer[10];
  const hasGlobalColorTable = Boolean(logicalPacked & 0x80);
  let offset = 13;
  if (hasGlobalColorTable) {
    const colorBytes = 3 * 2 ** ((logicalPacked & 0x07) + 1);
    if (colorBytes > limits.maxChunkBytes) {
      fail("CHUNK_LIMIT", "GIF global color table exceeds the chunk limit");
    }
    requireBytes(buffer, offset, colorBytes, "GIF global color table");
    offset += colorBytes;
  }

  let frameCount = 0;
  let loopCount = null;
  let chunkCount = 0;
  let trailerSeen = false;

  const countChunk = (context) => {
    chunkCount += 1;
    if (chunkCount > limits.maxChunks) {
      fail("CHUNK_COUNT_LIMIT", `${context} exceeds the chunk-count limit`);
    }
  };

  const subBlocks = (context, capture = false) => {
    let total = 0;
    const parts = [];
    while (true) {
      requireBytes(buffer, offset, 1, `${context} sub-block length`);
      const length = buffer[offset];
      offset += 1;
      if (length === 0) break;
      countChunk(context);
      total += length;
      if (total > limits.maxChunkBytes) {
        fail("CHUNK_LIMIT", `${context} data exceeds the chunk limit`);
      }
      requireBytes(buffer, offset, length, `${context} sub-block`);
      if (capture) parts.push(buffer.subarray(offset, offset + length));
      offset += length;
    }
    return capture ? Buffer.concat(parts, total) : null;
  };

  while (offset < buffer.length) {
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0x3b) {
      trailerSeen = true;
      break;
    }
    if (marker === 0x2c) {
      if (frameCount >= limits.maxFrames) {
        fail("FRAME_LIMIT", "GIF frame count exceeds the configured limit");
      }
      countChunk("GIF image descriptor");
      requireBytes(buffer, offset, 9, "GIF image descriptor");
      const left = buffer.readUInt16LE(offset);
      const top = buffer.readUInt16LE(offset + 2);
      const frameWidth = buffer.readUInt16LE(offset + 4);
      const frameHeight = buffer.readUInt16LE(offset + 6);
      const packed = buffer[offset + 8];
      offset += 9;
      if (packed & 0x18) {
        fail("INVALID_GIF_DESCRIPTOR", "GIF image descriptor reserved bits must be zero");
      }
      assertCanvas(frameWidth, frameHeight, limits, "GIF frame");
      if (left + frameWidth > width || top + frameHeight > height) {
        fail("FRAME_OUT_OF_BOUNDS", "GIF frame exceeds the logical canvas");
      }
      const hasLocalColorTable = Boolean(packed & 0x80);
      if (hasLocalColorTable) {
        const colorBytes = 3 * 2 ** ((packed & 0x07) + 1);
        if (colorBytes > limits.maxChunkBytes) {
          fail("CHUNK_LIMIT", "GIF local color table exceeds the chunk limit");
        }
        requireBytes(buffer, offset, colorBytes, "GIF local color table");
        offset += colorBytes;
      } else if (!hasGlobalColorTable) {
        fail("MISSING_COLOR_TABLE", "GIF frame has no global or local color table");
      }
      requireBytes(buffer, offset, 1, "GIF LZW minimum code size");
      const minimumCodeSize = buffer[offset];
      offset += 1;
      if (minimumCodeSize < 2 || minimumCodeSize > 8) {
        fail("INVALID_GIF_LZW", "GIF LZW minimum code size must be between 2 and 8");
      }
      subBlocks("GIF image data");
      frameCount += 1;
      continue;
    }
    if (marker !== 0x21) {
      fail("INVALID_GIF_BLOCK", `unexpected GIF block marker 0x${marker.toString(16)}`);
    }

    requireBytes(buffer, offset, 1, "GIF extension label");
    const label = buffer[offset];
    offset += 1;
    countChunk("GIF extension");
    if (label === 0xf9) {
      requireBytes(buffer, offset, 6, "GIF graphic-control extension");
      if (buffer[offset] !== 4 || buffer[offset + 5] !== 0) {
        fail("INVALID_GIF_EXTENSION", "GIF graphic-control extension has invalid framing");
      }
      const controlPacked = buffer[offset + 1];
      if ((controlPacked & 0xe0) !== 0 || ((controlPacked >>> 2) & 0x07) > 3) {
        fail("INVALID_GIF_EXTENSION", "GIF graphic-control flags are invalid");
      }
      if (4 > limits.maxChunkBytes) {
        fail("CHUNK_LIMIT", "GIF graphic-control extension exceeds the chunk limit");
      }
      offset += 6;
      continue;
    }
    if (label === 0x01) {
      fail("UNSUPPORTED_GIF_EXTENSION", "GIF plain-text extensions are not allowed");
    }
    if (label === 0xff) {
      requireBytes(buffer, offset, 1, "GIF fixed extension length");
      const fixedLength = buffer[offset];
      offset += 1;
      const expected = 11;
      if (fixedLength !== expected) {
        fail(
          "INVALID_GIF_EXTENSION",
          `GIF extension 0x${label.toString(16)} must be ${expected} bytes`,
        );
      }
      if (fixedLength > limits.maxChunkBytes) {
        fail("CHUNK_LIMIT", "GIF fixed extension data exceeds the chunk limit");
      }
      requireBytes(buffer, offset, fixedLength, "GIF fixed extension data");
      const identifier = buffer.toString("ascii", offset, offset + 11);
      offset += fixedLength;
      if (identifier !== "NETSCAPE2.0" && identifier !== "ANIMEXTS1.0") {
        fail(
          "HIDDEN_METADATA",
          `GIF application extension ${JSON.stringify(identifier)} is not allowed`,
        );
      }
      const extensionData = subBlocks("GIF extension data", true);
      if (identifier === "NETSCAPE2.0" || identifier === "ANIMEXTS1.0") {
        if (extensionData.length !== 3 || extensionData[0] !== 1) {
          fail("INVALID_GIF_LOOP", "GIF loop extension payload is malformed");
        }
        const parsedLoop = extensionData.readUInt16LE(1);
        if (loopCount !== null && loopCount !== parsedLoop) {
          fail("CONFLICTING_LOOP_METADATA", "GIF contains conflicting loop metadata");
        }
        loopCount = parsedLoop;
      }
      continue;
    }
    if (label === 0xfe) {
      fail("HIDDEN_METADATA", "GIF comment extensions are not allowed");
    }
    fail("INVALID_GIF_EXTENSION", `unsupported GIF extension label 0x${label.toString(16)}`);
  }

  if (!trailerSeen) fail("MISSING_GIF_TRAILER", "GIF trailer is missing");
  if (offset !== buffer.length) fail("TRAILING_DATA", "GIF contains data after its trailer");
  if (frameCount === 0) fail("MISSING_FRAMES", "GIF contains no image frames");
  return result("gif", width, height, frameCount, loopCount);
}

let crcTable;
function crc32(buffer) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      crcTable[index] = value >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const PNG_BIT_DEPTHS = new Map([
  [0, new Set([1, 2, 4, 8, 16])],
  [2, new Set([8, 16])],
  [3, new Set([1, 2, 4, 8])],
  [4, new Set([8, 16])],
  [6, new Set([8, 16])],
]);

function inspectPng(buffer, limits) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  requireBytes(buffer, 0, signature.length, "PNG signature");
  if (!buffer.subarray(0, signature.length).equals(signature)) {
    fail("INVALID_PNG_SIGNATURE", "PNG signature is invalid");
  }

  let offset = 8;
  let chunkCount = 0;
  let width;
  let height;
  let bitDepth;
  let colorType;
  let seenIhdr = false;
  let seenPlte = false;
  let seenTrns = false;
  let paletteEntries = 0;
  let seenIdat = false;
  let idatClosed = false;
  let seenIend = false;
  let seenActl = false;
  let animationFrameTotal = null;
  let loopCount = null;
  let frameCount = 0;
  let expectedSequence = 0;
  let currentFrameHasData = false;
  let currentFrameDataKind = null;

  while (offset < buffer.length) {
    requireBytes(buffer, offset, 12, "PNG chunk");
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    if (!/^[A-Za-z]{4}$/.test(type) || (type.charCodeAt(2) & 0x20) !== 0) {
      fail("INVALID_PNG_CHUNK_TYPE", `PNG chunk type ${JSON.stringify(type)} is invalid`);
    }
    if (length > limits.maxChunkBytes) {
      fail("CHUNK_LIMIT", `PNG ${type} chunk exceeds the configured limit`);
    }
    requireBytes(buffer, offset + 8, length + 4, `PNG ${type} chunk`);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    const expectedCrc = buffer.readUInt32BE(offset + 8 + length);
    const actualCrc = crc32(buffer.subarray(offset + 4, offset + 8 + length));
    if (actualCrc !== expectedCrc) {
      fail("PNG_CRC_MISMATCH", `PNG ${type} chunk CRC is invalid`);
    }
    offset += 12 + length;
    chunkCount += 1;
    if (chunkCount > limits.maxChunks) {
      fail("CHUNK_COUNT_LIMIT", "PNG chunk count exceeds the configured limit");
    }
    if (!seenIhdr && type !== "IHDR") fail("PNG_ORDER", "IHDR must be the first PNG chunk");
    if (seenIend) fail("TRAILING_DATA", "PNG contains chunks after IEND");
    if (seenIdat && type !== "IDAT") idatClosed = true;

    if (type === "IHDR") {
      if (seenIhdr || length !== 13) fail("INVALID_IHDR", "PNG must contain one 13-byte IHDR");
      seenIhdr = true;
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assertCanvas(width, height, limits, "PNG canvas");
      bitDepth = data[8];
      colorType = data[9];
      if (!PNG_BIT_DEPTHS.get(colorType)?.has(bitDepth)) {
        fail("INVALID_IHDR", "PNG bit-depth and color-type combination is invalid");
      }
      if (data[10] !== 0 || data[11] !== 0 || ![0, 1].includes(data[12])) {
        fail("INVALID_IHDR", "PNG compression, filter, or interlace method is invalid");
      }
      continue;
    }
    if (type === "PLTE") {
      if (seenPlte || seenIdat || length === 0 || length % 3 !== 0 || length > 768) {
        fail("INVALID_PLTE", "PNG PLTE must appear once before IDAT with 1 to 256 RGB entries");
      }
      if ([0, 4].includes(colorType)) {
        fail("INVALID_PLTE", "PNG grayscale color types must not contain PLTE");
      }
      if (colorType === 3 && length / 3 > 2 ** bitDepth) {
        fail("INVALID_PLTE", "indexed PNG PLTE has more entries than its bit depth permits");
      }
      paletteEntries = length / 3;
      seenPlte = true;
      continue;
    }
    if (type === "tRNS") {
      if (seenTrns || seenIdat) {
        fail("INVALID_TRNS", "PNG tRNS must appear at most once before IDAT");
      }
      if (colorType === 0 && length !== 2) {
        fail("INVALID_TRNS", "grayscale PNG tRNS must contain one sample");
      }
      if (colorType === 2 && length !== 6) {
        fail("INVALID_TRNS", "truecolor PNG tRNS must contain three samples");
      }
      if (colorType === 3 && (!seenPlte || length === 0 || length > paletteEntries)) {
        fail("INVALID_TRNS", "indexed PNG tRNS must follow PLTE and fit its palette");
      }
      if ([4, 6].includes(colorType)) {
        fail("INVALID_TRNS", "PNG color types with alpha must not contain tRNS");
      }
      seenTrns = true;
      continue;
    }
    if (type === "acTL") {
      if (seenActl || seenIdat || length !== 8) {
        fail("INVALID_ACTL", "APNG acTL must appear once before IDAT and be 8 bytes");
      }
      seenActl = true;
      animationFrameTotal = data.readUInt32BE(0);
      loopCount = data.readUInt32BE(4);
      if (animationFrameTotal === 0) fail("INVALID_ACTL", "APNG frame count must be positive");
      if (animationFrameTotal > limits.maxFrames) {
        fail("FRAME_LIMIT", "APNG declared frame count exceeds the configured limit");
      }
      continue;
    }
    if (type === "fcTL") {
      if (!seenActl || length !== 26) {
        fail("INVALID_FCTL", "APNG fcTL requires acTL and must be 26 bytes");
      }
      if (frameCount > 0 && !currentFrameHasData) {
        fail("MISSING_FRAME_DATA", "APNG frame has no IDAT or fdAT data");
      }
      if (frameCount >= limits.maxFrames) fail("FRAME_LIMIT", "APNG frame count exceeds the limit");
      const sequence = data.readUInt32BE(0);
      if (sequence !== expectedSequence)
        fail("APNG_SEQUENCE", "APNG sequence numbers are not contiguous");
      expectedSequence += 1;
      const frameWidth = data.readUInt32BE(4);
      const frameHeight = data.readUInt32BE(8);
      const x = data.readUInt32BE(12);
      const y = data.readUInt32BE(16);
      assertCanvas(frameWidth, frameHeight, limits, "APNG frame");
      if (
        frameCount === 0 &&
        !seenIdat &&
        (frameWidth !== width || frameHeight !== height || x !== 0 || y !== 0)
      ) {
        fail(
          "INVALID_FCTL",
          "APNG first frame control before IDAT must match the full default-image canvas",
        );
      }
      if (x + frameWidth > width || y + frameHeight > height) {
        fail("FRAME_OUT_OF_BOUNDS", "APNG frame exceeds the PNG canvas");
      }
      if (data[24] > 2 || data[25] > 1) {
        fail("INVALID_FCTL", "APNG dispose or blend operation is invalid");
      }
      frameCount += 1;
      currentFrameHasData = false;
      currentFrameDataKind = seenIdat ? "fdat" : "idat";
      continue;
    }
    if (type === "IDAT") {
      if (length === 0) fail("INVALID_IDAT", "PNG IDAT chunk must not be empty");
      if (idatClosed) fail("PNG_ORDER", "PNG IDAT chunks must be consecutive");
      if (colorType === 3 && !seenPlte) {
        fail("MISSING_PLTE", "indexed PNG requires PLTE before IDAT");
      }
      if (frameCount > 0 && currentFrameDataKind !== "idat") {
        fail("PNG_ORDER", "APNG IDAT data is only valid for the controlled default frame");
      }
      seenIdat = true;
      if (currentFrameDataKind === "idat") currentFrameHasData = true;
      continue;
    }
    if (type === "fdAT") {
      if (
        !seenActl ||
        !seenIdat ||
        frameCount === 0 ||
        currentFrameDataKind !== "fdat" ||
        length < 5
      ) {
        fail("INVALID_FDAT", "APNG fdAT requires prior IDAT data and a subsequent frame control");
      }
      const sequence = data.readUInt32BE(0);
      if (sequence !== expectedSequence)
        fail("APNG_SEQUENCE", "APNG sequence numbers are not contiguous");
      expectedSequence += 1;
      currentFrameHasData = true;
      continue;
    }
    if (type === "IEND") {
      if (length !== 0 || !seenIdat) fail("INVALID_IEND", "PNG IEND is invalid or IDAT is missing");
      if (frameCount > 0 && !currentFrameHasData) {
        fail("MISSING_FRAME_DATA", "APNG final frame has no IDAT or fdAT data");
      }
      seenIend = true;
      if (offset !== buffer.length) fail("TRAILING_DATA", "PNG contains data after IEND");
      break;
    }
    if (type[0] === type[0].toUpperCase()) {
      fail("UNKNOWN_CRITICAL_CHUNK", `unsupported critical PNG chunk ${type}`);
    }
    if (["eXIf", "iCCP", "iTXt", "tEXt", "tIME", "zTXt"].includes(type)) {
      fail("HIDDEN_METADATA", `PNG metadata chunk ${type} is not allowed`);
    }
    if (!["cHRM", "gAMA", "sBIT", "sRGB"].includes(type)) {
      fail("UNSUPPORTED_ANCILLARY_CHUNK", `unsupported PNG ancillary chunk ${type}`);
    }
  }

  if (!seenIhdr || !seenIend) fail("INCOMPLETE_PNG", "PNG is missing IHDR or IEND");
  if (seenActl) {
    if (frameCount === 0 || frameCount !== animationFrameTotal) {
      fail("APNG_FRAME_COUNT", "APNG fcTL count does not match acTL");
    }
    return result("apng", width, height, frameCount, loopCount);
  }
  if (frameCount > 0) fail("APNG_CONTROL_WITHOUT_ACTL", "APNG frame control appears without acTL");
  return result("png", width, height, 1, null);
}

function uint24Le(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function parseVp8Dimensions(data, context) {
  if (data.length < 10 || (data[0] & 1) !== 0) {
    fail("INVALID_VP8", `${context} VP8 key-frame header is invalid`);
  }
  if (data[3] !== 0x9d || data[4] !== 0x01 || data[5] !== 0x2a) {
    fail("INVALID_VP8", `${context} VP8 start code is invalid`);
  }
  return {
    width: data.readUInt16LE(6) & 0x3fff,
    height: data.readUInt16LE(8) & 0x3fff,
  };
}

function parseVp8lDimensions(data, context) {
  if (data.length < 5 || data[0] !== 0x2f) {
    fail("INVALID_VP8L", `${context} VP8L header is invalid`);
  }
  const bits = data.readUInt32LE(1);
  if (bits >>> 29 !== 0) fail("INVALID_VP8L", `${context} VP8L version must be zero`);
  return {
    width: (bits & 0x3fff) + 1,
    height: ((bits >>> 14) & 0x3fff) + 1,
  };
}

function parseWebpFramePayload(data, frameWidth, frameHeight, limits, countChunk) {
  let offset = 16;
  let imageDimensions = null;
  let alphaSeen = false;
  while (offset < data.length) {
    requireBytes(data, offset, 8, "WebP ANMF child chunk");
    const type = data.toString("ascii", offset, offset + 4);
    const length = data.readUInt32LE(offset + 4);
    if (length > limits.maxChunkBytes)
      fail("CHUNK_LIMIT", `WebP ${type} child chunk exceeds the limit`);
    const paddedLength = length + (length & 1);
    requireBytes(data, offset + 8, paddedLength, `WebP ${type} child chunk`);
    if (length & 1 && data[offset + 8 + length] !== 0) {
      fail("INVALID_WEBP_PADDING", `WebP ${type} child padding byte must be zero`);
    }
    countChunk("WebP ANMF child chunk");
    const payload = data.subarray(offset + 8, offset + 8 + length);
    if (type === "ALPH") {
      if (alphaSeen || imageDimensions)
        fail("WEBP_FRAME_ORDER", "WebP ALPH must precede one frame image");
      alphaSeen = true;
    } else if (type === "VP8 ") {
      if (imageDimensions)
        fail("MULTIPLE_FRAME_IMAGES", "WebP frame contains multiple image chunks");
      imageDimensions = parseVp8Dimensions(payload, "WebP frame");
    } else if (type === "VP8L") {
      if (imageDimensions || alphaSeen) {
        fail("WEBP_FRAME_ORDER", "WebP lossless frame cannot follow ALPH or another image");
      }
      imageDimensions = parseVp8lDimensions(payload, "WebP frame");
    } else {
      fail(
        "INVALID_WEBP_FRAME_CHUNK",
        `unsupported WebP frame child chunk ${JSON.stringify(type)}`,
      );
    }
    offset += 8 + paddedLength;
  }
  if (!imageDimensions) fail("MISSING_FRAME_IMAGE", "WebP ANMF contains no VP8 or VP8L image");
  assertCanvas(imageDimensions.width, imageDimensions.height, limits, "WebP frame bitstream");
  if (imageDimensions.width !== frameWidth || imageDimensions.height !== frameHeight) {
    fail("FRAME_DIMENSION_MISMATCH", "WebP ANMF and frame bitstream dimensions differ");
  }
}

function inspectWebp(buffer, limits) {
  requireBytes(buffer, 0, 12, "WebP RIFF header");
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    fail("INVALID_WEBP_SIGNATURE", "WebP RIFF signature is invalid");
  }
  const declaredSize = buffer.readUInt32LE(4) + 8;
  if (declaredSize !== buffer.length)
    fail("WEBP_SIZE_MISMATCH", "WebP RIFF size does not match the file");

  let offset = 12;
  let chunkCount = 0;
  let width;
  let height;
  let extended = false;
  let animationFlag = false;
  let animSeen = false;
  let loopCount = null;
  let frameCount = 0;
  let staticDimensions = null;
  let topLevelAlpha = false;

  const countChunk = (context) => {
    chunkCount += 1;
    if (chunkCount > limits.maxChunks)
      fail("CHUNK_COUNT_LIMIT", `${context} exceeds the chunk limit`);
  };

  while (offset < buffer.length) {
    requireBytes(buffer, offset, 8, "WebP chunk");
    const type = buffer.toString("ascii", offset, offset + 4);
    const length = buffer.readUInt32LE(offset + 4);
    if (!/^[A-Z0-9 ]{4}$/.test(type))
      fail("INVALID_WEBP_CHUNK", `invalid WebP chunk type ${JSON.stringify(type)}`);
    if (length > limits.maxChunkBytes) fail("CHUNK_LIMIT", `WebP ${type} chunk exceeds the limit`);
    const paddedLength = length + (length & 1);
    requireBytes(buffer, offset + 8, paddedLength, `WebP ${type} chunk`);
    if (length & 1 && buffer[offset + 8 + length] !== 0) {
      fail("INVALID_WEBP_PADDING", `WebP ${type} padding byte must be zero`);
    }
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 8 + paddedLength;
    countChunk("WebP");

    if (type === "VP8X") {
      if (extended || chunkCount !== 1 || length !== 10) {
        fail("INVALID_VP8X", "WebP VP8X must be the first chunk and exactly 10 bytes");
      }
      if ((data[0] & 0xc1) !== 0 || data[1] !== 0 || data[2] !== 0 || data[3] !== 0) {
        fail("INVALID_VP8X", "WebP VP8X reserved bits and bytes must be zero");
      }
      if (data[0] & 0x2c) {
        fail("HIDDEN_METADATA", "WebP ICC, EXIF, and XMP metadata flags are not allowed");
      }
      extended = true;
      animationFlag = Boolean(data[0] & 0x02);
      width = uint24Le(data, 4) + 1;
      height = uint24Le(data, 7) + 1;
      assertCanvas(width, height, limits, "WebP canvas");
      continue;
    }
    if (type === "ANIM") {
      if (!extended || !animationFlag || animSeen || frameCount > 0 || length !== 6) {
        fail("INVALID_ANIM", "WebP ANIM requires one animation VP8X and must precede frames");
      }
      animSeen = true;
      loopCount = data.readUInt16LE(4);
      continue;
    }
    if (type === "ANMF") {
      if (!animSeen || length < 24) fail("INVALID_ANMF", "WebP ANMF requires ANIM and frame data");
      if (frameCount >= limits.maxFrames) fail("FRAME_LIMIT", "WebP frame count exceeds the limit");
      const x = uint24Le(data, 0) * 2;
      const y = uint24Le(data, 3) * 2;
      const frameWidth = uint24Le(data, 6) + 1;
      const frameHeight = uint24Le(data, 9) + 1;
      if (data[15] & 0xfc) fail("INVALID_ANMF", "WebP ANMF reserved flag bits must be zero");
      assertCanvas(frameWidth, frameHeight, limits, "WebP frame");
      if (x + frameWidth > width || y + frameHeight > height) {
        fail("FRAME_OUT_OF_BOUNDS", "WebP frame exceeds its canvas");
      }
      parseWebpFramePayload(data, frameWidth, frameHeight, limits, countChunk);
      frameCount += 1;
      continue;
    }
    if (type === "VP8 " || type === "VP8L") {
      if (staticDimensions || animSeen)
        fail("MULTIPLE_WEBP_IMAGES", "WebP contains unexpected image chunks");
      staticDimensions =
        type === "VP8 " ? parseVp8Dimensions(data, "WebP") : parseVp8lDimensions(data, "WebP");
      if (type === "VP8L" && topLevelAlpha) {
        fail("WEBP_IMAGE_ORDER", "WebP ALPH cannot precede a lossless VP8L image");
      }
      assertCanvas(staticDimensions.width, staticDimensions.height, limits, "WebP image");
      continue;
    }
    if (type === "ALPH") {
      if (!extended || animationFlag || topLevelAlpha || staticDimensions) {
        fail("WEBP_IMAGE_ORDER", "WebP ALPH must precede one extended static VP8 image");
      }
      topLevelAlpha = true;
      continue;
    }
    if (["ICCP", "EXIF", "XMP "].includes(type)) {
      fail("HIDDEN_METADATA", `WebP metadata chunk ${type.trim()} is not allowed`);
    }
    fail("UNKNOWN_WEBP_CHUNK", `unsupported WebP chunk ${JSON.stringify(type)}`);
  }

  if (animationFlag) {
    if (!animSeen || frameCount === 0)
      fail("INCOMPLETE_ANIMATION", "animated WebP lacks ANIM or ANMF chunks");
    if (staticDimensions)
      fail("INVALID_ANIMATED_WEBP", "animated WebP contains a top-level image chunk");
    return result("webp", width, height, frameCount, loopCount);
  }
  if (animSeen || frameCount > 0)
    fail("UNDECLARED_ANIMATION", "WebP animation chunks lack the VP8X flag");
  if (!staticDimensions) fail("MISSING_WEBP_IMAGE", "static WebP contains no VP8 or VP8L image");
  if (extended) {
    if (staticDimensions.width !== width || staticDimensions.height !== height) {
      fail("CANVAS_DIMENSION_MISMATCH", "WebP VP8X and image dimensions differ");
    }
  } else {
    ({ width, height } = staticDimensions);
  }
  return result("webp", width, height, 1, null);
}

export function inspectAnimatedImage(input, options = {}) {
  const limits = normalizeLimits(options);
  const buffer = Buffer.isBuffer(input)
    ? input
    : input instanceof Uint8Array
      ? Buffer.from(input.buffer, input.byteOffset, input.byteLength)
      : null;
  if (!buffer) fail("INVALID_INPUT", "input must be a Buffer or Uint8Array", "usage");
  if (buffer.length === 0) fail("EMPTY_FILE", "image file is empty");
  if (buffer.length > limits.maxFileBytes) {
    fail("FILE_LIMIT", "image file exceeds the configured byte limit");
  }
  if (buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6))) {
    return inspectGif(buffer, limits);
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return inspectPng(buffer, limits);
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return inspectWebp(buffer, limits);
  }
  fail("UNSUPPORTED_FORMAT", "file is not a GIF, PNG/APNG, or WebP image");
}

export function inspectAnimatedImageFile(filePath, options = {}) {
  const limits = normalizeLimits(options);
  let descriptor;
  try {
    const pathStat = lstatSync(filePath);
    if (!pathStat.isFile()) {
      fail("NOT_REGULAR_FILE", "input path is not a regular file", "io");
    }
    const safeReadFlags =
      fsConstants.O_RDONLY | (fsConstants.O_NONBLOCK ?? 0) | (fsConstants.O_NOFOLLOW ?? 0);
    descriptor = openSync(filePath, safeReadFlags);
    const stat = fstatSync(descriptor);
    if (!stat.isFile()) fail("NOT_REGULAR_FILE", "input path is not a regular file", "io");
    if (stat.size > limits.maxFileBytes) {
      fail("FILE_LIMIT", "image file exceeds the configured byte limit");
    }
    const buffer = Buffer.alloc(Math.min(stat.size, limits.maxFileBytes) + 1);
    let total = 0;
    while (total < buffer.length) {
      const read = readSync(descriptor, buffer, total, buffer.length - total, null);
      if (read === 0) break;
      total += read;
    }
    if (total > limits.maxFileBytes)
      fail("FILE_LIMIT", "image file exceeds the configured byte limit");
    return inspectAnimatedImage(buffer.subarray(0, total), limits);
  } catch (error) {
    if (error instanceof AnimatedImageError) throw error;
    fail("READ_ERROR", `unable to read local image: ${error.message}`, "io");
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}
