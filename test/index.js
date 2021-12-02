import { execa } from 'execa';
import fs from 'fs';
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(__dirname);




const packages = fs
  .readdirSync(resolve(__dirname, '../packages'))

console.log(packages)


async function fun1 () {
  // const {stdout} = await execa('node', ['-p', '1+2']);
  // console.log(stdout);
  
}

fun1()