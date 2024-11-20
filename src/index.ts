import { getInput } from '@actions/core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import OSS from 'ali-oss';

function resolvePath (filePath: string) {
  // if the path is '~', replace it with the home directory
  if (filePath.startsWith('~/')) {
    const homeDirectory = os.homedir();
    filePath = path.join(homeDirectory, filePath.slice(2));
  }
  return path.resolve(filePath);
}

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
  const timeout = getInputWarp('timeout');

  if (source) {
    const f = fs.existsSync(resolvePath(source));
    if (!f) {
      throw new Error(`File not found: ${source}`);
    }
  }

  // init OSS client. Please replace following arguments to your own.
  const client = new OSS({
    region,
    accessKeyId,
    accessKeySecret,
    bucket,
    timeout,
    secure: true
  });

  /** upload file to Ali OSS  */
  async function uploadToAliOss (sourceFile: string, ossTargetFile: string) {
    try {
      const uploadResult = await client.put(ossTargetFile, sourceFile);
      console.log('Success:', uploadResult);
    } catch (error) {
      console.error('Error', error);
      process.exit(1);
    }
  }

  uploadToAliOss(resolvePath(source), dest);
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}