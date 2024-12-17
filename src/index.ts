import { getInput } from '@actions/core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import OSS from 'ali-oss';
import glob from 'tiny-glob';

function resolvePath (filePath: string) {
  // if the path is '~', replace it with the home directory
  if (filePath.startsWith('~/')) {
    const homeDirectory = os.homedir();
    filePath = path.join(homeDirectory, filePath.slice(2));
  }
  return path.resolve(filePath);
}

function getInputWarp (key: string, required = true) {
  const val = getInput(key, { required });
  if (required && !val) {
    throw new Error(`Missing required input: ${key}`);
  }
  return val;
}

async function main () {
  const globPattern = getInputWarp('files', false);

  const source = getInputWarp('source', false);
  const dest = getInputWarp('dest');
  const bucket = getInputWarp('bucket');
  const region = getInputWarp('region');
  const accessKeyId = getInputWarp('accessKeyId');
  const accessKeySecret = getInputWarp('accessKeySecret');
  const timeout = getInputWarp('timeout', false);

  if (source && globPattern) {
    throw new Error('source and files cannot be used together');
  }

  let files: [string, string][] = [];
  if (source) {
    const f = fs.existsSync(resolvePath(source));
    if (!f) {
      throw new Error(`File not found: ${source}`);
    }
    files.push([resolvePath(source), dest]);
  } else if (globPattern) {
    const pattern = globPattern.split('\n');
    files = (await Promise.all(pattern.map(p => glob(p)))).flat().map(p => [
      p, 
      path.posix.join(dest, path.basename(p))
    ]);
    if (files.length === 0) {
      throw new Error(`No files found with pattern: ${globPattern}`);
    } else {
      console.log('Found files:', files);
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
      error(error);
      process.exit(1);
    }
  }

  for (const file of files) {
    await uploadToAliOss(file[0], file[1]);
  }
}

try {
  main().catch(e => {
    console.error(e);
    process.exit(1);
  });
} catch (e) {
  console.error(e);
  process.exit(1);
}