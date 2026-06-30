const axios = require('axios');
const fs = require('fs');
const path = require('path');

const transUrl = 'https://prod-tingwu-paas-common-beijing.oss-cn-beijing.aliyuncs.com/tingwu/output/1226341769466572/1eb8164f35354ee0988965d89de84416/1eb8164f35354ee0988965d89de84416_Transcription_20260507224330.json?Expires=1780757033&OSSAccessKeyId=LTAI5tMzZ1D4o1drkJN1TfCr&Signature=x2iZVZeaDp9AKcaQISbgVIw7NxA%3D';
const sumUrl = 'https://prod-tingwu-paas-common-beijing.oss-cn-beijing.aliyuncs.com/tingwu/output/1226341769466572/1eb8164f35354ee0988965d89de84416/1eb8164f35354ee0988965d89de84416_Summarization_20260507224350.json?Expires=1780757033&OSSAccessKeyId=LTAI5tMzZ1D4o1drkJN1TfCr&Signature=ird%2FwAo0NFskGIAIKqjq9P3EFqg%3D';

async function main() {
  const base = 'C:/Users/Administrator/Desktop/smart-meet-ai';
  
  const transRes = await axios.get(transUrl);
  fs.writeFileSync(path.join(base, 'transcription_sample.json'), JSON.stringify(transRes.data, null, 2));
  console.log('Saved transcription_sample.json');
  
  const sumRes = await axios.get(sumUrl);
  fs.writeFileSync(path.join(base, 'summarization_sample.json'), JSON.stringify(sumRes.data, null, 2));
  console.log('Saved summarization_sample.json');
  
  // Print structure
  console.log('\n=== TRANSCRIPTION KEYS ===');
  console.log(Object.keys(transRes.data));
  if (transRes.data.Result) console.log('Result keys:', Object.keys(transRes.data.Result));
  if (transRes.data.Result?.Transcription) console.log('Transcription keys:', Object.keys(transRes.data.Result.Transcription));
  if (transRes.data.Result?.Transcription?.Paragraphs) console.log('Paragraphs count:', transRes.data.Result.Transcription.Paragraphs.length);
  if (transRes.data.Result?.Transcription?.Paragraphs?.[0]) console.log('First paragraph keys:', Object.keys(transRes.data.Result.Transcription.Paragraphs[0]));
  
  console.log('\n=== SUMMARIZATION KEYS ===');
  console.log(Object.keys(sumRes.data));
  if (sumRes.data.Summarization) console.log('Summarization keys:', Object.keys(sumRes.data.Summarization));
  if (sumRes.data.Summarization?.ParagraphSummary) console.log('ParagraphSummary:', sumRes.data.Summarization.ParagraphSummary.substring(0, 200));
  if (sumRes.data.Summarization?.ConversationalSummary) console.log('ConversationalSummary count:', sumRes.data.Summarization.ConversationalSummary.length);
  if (sumRes.data.Summarization?.ConversationalSummary?.[0]) console.log('First ConversationalSummary:', JSON.stringify(sumRes.data.Summarization.ConversationalSummary[0]));
  if (sumRes.data.Summarization?.QuestionsAnsweringSummary) console.log('QuestionsAnsweringSummary count:', sumRes.data.Summarization.QuestionsAnsweringSummary.length);
  if (sumRes.data.Summarization?.QuestionsAnsweringSummary?.[0]) console.log('First QA:', JSON.stringify(sumRes.data.Summarization.QuestionsAnsweringSummary[0]));
}

main().catch(console.error);
