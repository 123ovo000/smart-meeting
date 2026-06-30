const axios = require('axios');
const fs = require('fs');
const path = require('path');

const transUrl = 'https://prod-tingwu-paas-common-beijing.oss-cn-beijing.aliyuncs.com/tingwu/output/1226341769466572/1eb8164f35354ee0988965d89de84416/1eb8164f35354ee0988965d89de84416_Transcription_20260507224330.json?Expires=1780757033&OSSAccessKeyId=LTAI5tMzZ1D4o1drkJN1TfCr&Signature=x2iZVZeaDp9AKcaQISbgVIw7NxA%3D';
const sumUrl = 'https://prod-tingwu-paas-common-beijing.oss-cn-beijing.aliyuncs.com/tingwu/output/1226341769466572/1eb8164f35354ee0988965d89de84416/1eb8164f35354ee0988965d89de84416_Summarization_20260507224350.json?Expires=1780757033&OSSAccessKeyId=LTAI5tMzZ1D4o1drkJN1TfCr&Signature=ird%2FwAo0NFskGIAIKqjq9P3EFqg%3D';

async function main() {
  const base = 'C:/Users/Administrator/Desktop/smart-meet-ai';
  
  console.log('Fetching transcription...');
  const transRes = await axios.get(transUrl);
  fs.writeFileSync(path.join(base, 'transcription_sample.json'), JSON.stringify(transRes.data, null, 2));
  console.log('Saved transcription_sample.json');
  
  console.log('Fetching summarization...');
  const sumRes = await axios.get(sumUrl);
  fs.writeFileSync(path.join(base, 'summarization_sample.json'), JSON.stringify(sumRes.data, null, 2));
  console.log('Saved summarization_sample.json');
  
  // Analyze structure
  const trans = transRes.data;
  const sum = sumRes.data;
  
  console.log('\n========== TRANSCRIPTION STRUCTURE ==========');
  console.log('Top keys:', Object.keys(trans));
  if (trans.Result) {
    console.log('Result keys:', Object.keys(trans.Result));
    if (trans.Result.Transcription) {
      console.log('Transcription keys:', Object.keys(trans.Result.Transcription));
      if (trans.Result.Transcription.Paragraphs) {
        console.log('Paragraphs count:', trans.Result.Transcription.Paragraphs.length);
        const p0 = trans.Result.Transcription.Paragraphs[0];
        console.log('First paragraph keys:', Object.keys(p0));
        console.log('First paragraph SpeakerId:', p0.SpeakerId);
        console.log('First paragraph SpeakerName:', p0.SpeakerName);
        if (p0.Words) {
          console.log('First paragraph Words count:', p0.Words.length);
          console.log('First word keys:', Object.keys(p0.Words[0]));
          console.log('First word sample:', JSON.stringify(p0.Words[0]));
        }
      }
    }
  }
  
  console.log('\n========== SUMMARIZATION STRUCTURE ==========');
  console.log('Top keys:', Object.keys(sum));
  if (sum.Summarization) {
    console.log('Summarization keys:', Object.keys(sum.Summarization));
    console.log('Has ParagraphSummary:', !!sum.Summarization.ParagraphSummary);
    if (sum.Summarization.ParagraphSummary) {
      console.log('ParagraphSummary preview:', sum.Summarization.ParagraphSummary.substring(0, 500));
    }
    console.log('ConversationalSummary count:', sum.Summarization.ConversationalSummary?.length || 0);
    if (sum.Summarization.ConversationalSummary?.[0]) {
      console.log('First ConversationalSummary:', JSON.stringify(sum.Summarization.ConversationalSummary[0], null, 2));
    }
    console.log('QuestionsAnsweringSummary count:', sum.Summarization.QuestionsAnsweringSummary?.length || 0);
    if (sum.Summarization.QuestionsAnsweringSummary?.[0]) {
      console.log('First QA:', JSON.stringify(sum.Summarization.QuestionsAnsweringSummary[0], null, 2));
    }
  }
  
  console.log('\n========== DONE ==========');
}

main().catch(err => {
  console.error('Error:', err.message);
  if (err.response) console.error('Response data:', err.response.data?.substring?.(0, 500));
});
