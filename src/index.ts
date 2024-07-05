import { getInput } from '@actions/core';
import fs from 'node:fs';
import path from 'node:path';
import OSS from 'ali-oss';

function getInputWarp (key: string) {
  const val = getInput(key);
  if (!val) {
    throw new Error(`Missing required input: ${key}`);
  }
  return val;
}

function main () {
  const source = getInputWarp('source');
  const dest = getInputWarp('dest');
  const bucket = getInputWarp('bucket');
  const region = getInputWarp('region');
  const accessKeyId = getInputWarp('accessKeyId');
  const accessKeySecret = getInputWarp('accessKeySecret');

  if (source) {
    const f = fs.existsSync(path.resolve(source));
    if (!f) {
      throw new Error('source file not found');
    }
  }

  // init OSS client. Please replace following arguments to your own.
  const client = new OSS({
    region,
    accessKeyId,
    accessKeySecret,
    bucket,
  });

  /** upload file to Ali OSS  */
  async function uploadToAliOss (sourceFile: string, ossTargetFile: string) {
    try {
      const uploadResult = await client.put(ossTargetFile, sourceFile);
      console.log('Success:', uploadResult);
    } catch (error) {
      console.error('Error', error);
    }
  }

  uploadToAliOss(path.resolve(source), dest);
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}