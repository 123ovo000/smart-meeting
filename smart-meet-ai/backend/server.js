// c:\Users\30684\Desktop\smart-meet-ai\backend\server.js
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const OSS = require('ali-oss');
const axios = require('axios');

const tingwu20230930 = require('@alicloud/tingwu20230930');
const OpenApi = require('@alicloud/openapi-client');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/downloads', express.static(path.join(__dirname, 'results')));

// 1. 初始化 OSS 客户端
const ossClient = new OSS({
    region: 'oss-cn-beijing',
    accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
    bucket: '6667879',
});

// 2. 初始化听悟客户端
const config = new OpenApi.Config({
    accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
    endpoint: `tingwu.cn-beijing.aliyuncs.com`,
    regionId: 'cn-beijing'
});
const tingwuClient = new tingwu20230930.default(config);

const RESULTS_DIR = path.join(__dirname, 'results');
if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR);

const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 2 * 1024 * 1024 * 1024 } 
});

/**
 * 接口 A: 提交任务 (集成声纹识别 + 三种摘要类型请求)
 */
app.post('/api/tingwu/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: '未选择文件' });
    const localPath = req.file.path;
    const ossFileName = `tingwu/${Date.now()}-${req.file.originalname}`;

    try {
        console.log(`第一步：正在【分片上传】大文件至 OSS: ${req.file.originalname}...`);
        
        await ossClient.multipartUpload(ossFileName, localPath, {
            progress: (p) => {
                console.log(`上传进度: ${(p * 100).toFixed(2)}%`);
            }
        });
        
        const fileUrl = ossClient.signatureUrl(ossFileName, { expires: 3600 * 24 });
        console.log('✅ OSS 分片上传成功');

        let createTaskRequest = new tingwu20230930.CreateTaskRequest();
        createTaskRequest.type = 'offline';
        createTaskRequest.appKey = 'zKslqHQDn2n0ktLz';
        createTaskRequest.input = { 
            sourceLanguage: 'cn', 
            fileUrl: fileUrl 
        };
        
        // 🛠️ 核心修改：设置发言人声纹识别，并同时请求 3 种摘要功能
        createTaskRequest.parameters = {
            transcription: { 
                diarizationEnabled: true, // 开启发言人区分
                diarization: {
                    speakerCount: 0       // 0 表示自动识别发言人数量
                }
            },
            summarizationEnabled: true,   // 开启摘要生成
            summarization: {
                // 同时开启三种摘要：章节、对话发言人、智能问答
                types: ["Paragraph", "Conversational", "QuestionsAnswering"] 
            }
        };

        const response = await tingwuClient.createTask(createTaskRequest);
        const taskId = response.body.data.taskId;
        
        console.log(`🚀 任务提交成功！长视频 TaskId: ${taskId}`);
        res.json({ success: true, jobId: taskId });

    } catch (err) {
        console.error('❌ 提交失败:', err.message);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    }
});

/**
 * 接口 B: 查询并精准解析结果 (完美整合 3 大功能结果)
 */
app.get('/api/tingwu/result/:jobId', async (req, res) => {
    const { jobId } = req.params;

    if (!jobId || jobId === 'undefined' || jobId === 'null') {
        return res.json({ success: true, status: 'WAITING' });
    }

    try {
        const response = await tingwuClient.getTaskInfo(jobId);
        const taskData = response.body.data;
        
        console.log(`📡 实时状态: ${taskData.taskStatus}`);
        
        if (taskData.taskStatus === 'COMPLETED') {
            const resultObj = taskData.result || {};
            const transcriptionUrl = resultObj.transcription || resultObj.Transcription;
            const summarizationUrl = resultObj.summarization || resultObj.Summarization;

            console.log(`\n✅ 任务 [${jobId}] 已完成！`);
            console.log(`🔗 原文链接: ${transcriptionUrl}`);
            console.log(`🔗 摘要链接: ${summarizationUrl}\n`);

            // 并发下载原文和摘要包
            const [transRes, sumRes] = await Promise.all([
                transcriptionUrl ? axios.get(transcriptionUrl) : Promise.resolve({ data: {} }),
                summarizationUrl ? axios.get(summarizationUrl) : Promise.resolve({ data: {} })
            ]);

            const transJson = transRes.data;
            const sumJson = sumRes.data;

            // ==================== 1. 智能摘要解析模块 ====================
            const rootSum = sumJson.Summarization || sumJson.summarization || sumJson.Result?.Summarization || sumJson;
            let summaryContent = "";

            // A. 解析 Paragraph 章节摘要
            const paragraphSummary = rootSum.ParagraphSummary || rootSum.paragraphSummary;
            const paragraphTitle = rootSum.ParagraphTitle || rootSum.paragraphTitle;
            
            // 🎯 验证摘要内容有效性
            const isValidSummary = (text) => {
                if (!text) return false;
                const trimmed = text.trim();
                // 过滤无效内容
                const invalidPatterns = [
                    /^暂无摘要/i,
                    /^未生成摘要/i,
                    /^null$/i,
                    /^undefined$/i,
                    /^\s*$/,
                    /^\[object Object\]$/
                ];
                return !invalidPatterns.some(pattern => pattern.test(trimmed));
            };
            
            if (paragraphSummary && isValidSummary(paragraphSummary)) {
                summaryContent += `## 📌 章节摘要\n`;
                if (paragraphTitle && isValidSummary(paragraphTitle)) {
                    summaryContent += `**【标题】**：${paragraphTitle}\n\n`;
                }
                summaryContent += `${paragraphSummary}\n\n---\n\n`;
            }

            // B. 解析 Conversational 说话人单独总结
            const conversationalSummary = rootSum.ConversationalSummary || rootSum.conversationalSummary;
            if (Array.isArray(conversationalSummary) && conversationalSummary.length > 0) {
                const validConversations = conversationalSummary.filter(item => 
                    item && item.Summary && isValidSummary(item.Summary)
                );
                
                if (validConversations.length > 0) {
                    summaryContent += `## 👥 发言人视角总结\n`;
                    validConversations.forEach(item => {
                        const name = item.SpeakerName || item.SpeakerId || `发言人`;
                        summaryContent += `* **${name}**：${item.Summary}\n`;
                    });
                    summaryContent += `\n---\n\n`;
                }
            }

            // C. 解析 QuestionsAnswering 智能问答
            const qaSummary = rootSum.QuestionsAnsweringSummary || rootSum.questionsAnsweringSummary;
            if (Array.isArray(qaSummary) && qaSummary.length > 0) {
                const validQA = qaSummary.filter(item => 
                    item && item.Question && item.Answer && 
                    isValidSummary(item.Question) && isValidSummary(item.Answer)
                );
                
                if (validQA.length > 0) {
                    summaryContent += `## ❓ 智能问答提炼\n`;
                    validQA.forEach((item, index) => {
                        summaryContent += `**Q${index + 1}: ${item.Question}**\n`;
                        summaryContent += `> 💡 **答：** ${item.Answer}\n\n`;
                    });
                    summaryContent += `---\n\n`;
                }
            }

            if (!summaryContent || summaryContent.trim() === "") {
                summaryContent = "⚠️ 本次分析未生成有效的摘要内容，请尝试使用其他视频或音频文件。\n\n---\n\n";
            }

            // ==================== 2. 转写原文解析模块 ====================
            const rootTrans = transJson.Result || transJson.result || transJson;
            const paragraphs = rootTrans.Transcription?.Paragraphs || rootTrans.transcription?.paragraphs || [];
            
            let fullText = "";
            if (paragraphs.length > 0) {
                fullText = paragraphs.map(p => {
                    const words = p.Words || p.words || [];
                    const text = words.map(w => w.Text || w.text).join('');
                    const speakerName = p.SpeakerName || `发言人 ${p.SpeakerId || '1'}`;
                    return `[${speakerName}] : ${text}`;
                }).join('\n\n');
            } else {
                const fallbackSentences = transJson.Sentences || transJson.sentences || [];
                if (fallbackSentences.length > 0) {
                    fullText = fallbackSentences.map(s => s.Text || s.text).join('\n');
                } else {
                    fullText = "检测到任务已完成，但未能提取到有效文字。";
                }
            }

            // ==================== 3. 报告拼接及输出 ====================
            let report = `==============================================\n`;
            report += `  📝 SmartMeet AI 智能会议分析报告  \n`;
            report += `==============================================\n`;
            report += `任务ID: ${jobId}\n`;
            report += `原文 JSON 存证: ${transcriptionUrl}\n`;
            report += `摘要 JSON 存证: ${summarizationUrl || '未生成'}\n`;
            report += `==============================================\n\n`;
            
            report += summaryContent; // 拼接合并后的多重智能分析摘要
            
            report += `## 📜 完整会议转写原文:\n\n${fullText}`;

            // 🎯 提取纯摘要内容（不含报告头部）用于前端展示
            const pureSummary = summaryContent;

            const fileName = `report-${jobId}.txt`;
            fs.writeFileSync(path.join(RESULTS_DIR, fileName), report);

            // 也保存转写文件
            const transcriptFileName = `transcript-${jobId}.txt`;
            fs.writeFileSync(path.join(RESULTS_DIR, transcriptFileName), fullText, 'utf8');

            // ==================== 4. 解析发言人总结和待办事项 ====================
            const speakerSummaries = [];
            const actionItems = [];
            const chapters = [];

            // 🎯 从转写原文中统计每个发言人的发言时长（秒）
            const speakerDurationMap = {};
            if (paragraphs.length > 0) {
                paragraphs.forEach(p => {
                    const speakerName = p.SpeakerName || `发言人 ${p.SpeakerId || '1'}`;
                    const words = p.Words || p.words || [];
                    // 计算该段落的时长：取最后一个词的结束时间 - 第一个词的开始时间
                    if (words.length > 0) {
                        const firstWord = words[0];
                        const lastWord = words[words.length - 1];
                        const beginTime = firstWord.BeginTime || firstWord.beginTime || 0;
                        const endTime = lastWord.EndTime || lastWord.endTime || 0;
                        const duration = (endTime - beginTime) / 1000; // 转换为秒
                        if (!speakerDurationMap[speakerName]) {
                            speakerDurationMap[speakerName] = 0;
                        }
                        speakerDurationMap[speakerName] += duration;
                    }
                });
            }

            // 从 ConversationalSummary 提取发言人总结（复用上面已声明的变量）
            if (Array.isArray(conversationalSummary)) {
                conversationalSummary.forEach(item => {
                    const speakerName = item.SpeakerName || `发言人 ${item.SpeakerId || '未知'}`;
                    // 优先使用从原文统计的时长，其次使用接口返回的时长
                    const duration = speakerDurationMap[speakerName] || item.SpeechDuration || 0;
                    speakerSummaries.push({
                        speaker: speakerName,
                        summary: item.Summary || '',
                        duration: Math.round(duration) // 秒
                    });
                });
            }

            // 🎯 如果 ConversationalSummary 没有数据，但有发言人时长统计，也生成发言人总结
            if (speakerSummaries.length === 0 && Object.keys(speakerDurationMap).length > 0) {
                Object.entries(speakerDurationMap).forEach(([speakerName, duration]) => {
                    speakerSummaries.push({
                        speaker: speakerName,
                        summary: `${speakerName} 发言了 ${Math.round(duration / 60)} 分钟`,
                        duration: Math.round(duration)
                    });
                });
            }

            // 从 QuestionsAnsweringSummary 提取待办事项（复用上面已声明的变量）
            if (Array.isArray(qaSummary)) {
                qaSummary.forEach(item => {
                    if (item.Answer && item.Answer.length > 10) {
                        actionItems.push({
                            text: item.Answer.substring(0, 100),
                            owner: 'AI 分析',
                            content: item.Answer
                        });
                    }
                });
            }

            // 从 ParagraphSummary 提取章节
            if (paragraphSummary) {
                chapters.push({
                    title: paragraphTitle || '会议摘要',
                    summary: paragraphSummary,
                    startTime: 0
                });
            }

            // 🎯 保存各摘要类型的原始文本，供前端各标签页展示
            const rawParagraphText = (paragraphSummary && isValidSummary(paragraphSummary)) 
                ? `## 📌 章节摘要\n${paragraphTitle && isValidSummary(paragraphTitle) ? `**【标题】**：${paragraphTitle}\n\n` : ''}${paragraphSummary}` 
                : '';
            
            const validConversations = Array.isArray(conversationalSummary) 
                ? conversationalSummary.filter(item => item && item.Summary && isValidSummary(item.Summary))
                : [];
            const rawConversationalText = validConversations.length > 0
                ? validConversations.map(item => `* **${item.SpeakerName || item.SpeakerId || '发言人'}**：${item.Summary}`).join('\n')
                : '';
            
            const validQA = Array.isArray(qaSummary) 
                ? qaSummary.filter(item => item && item.Question && item.Answer && isValidSummary(item.Question) && isValidSummary(item.Answer))
                : [];
            const rawQAText = validQA.length > 0
                ? validQA.map((item, index) => `**Q${index + 1}: ${item.Question}**\n> 💡 **答：** ${item.Answer}`).join('\n\n')
                : '';

            // 保存 AI 分析结果为 JSON 文件
            const aiData = {
                jobId: jobId,
                // 🎯 只保存纯摘要内容（不含报告头部）
                summary: pureSummary,
                // 🎯 新增：各摘要类型的原始文本
                rawSummaries: {
                    paragraph: rawParagraphText,
                    conversational: rawConversationalText,
                    questionsAnswering: rawQAText
                },
                mindMap: null,
                chapters: chapters,
                meetingAssistance: null,
                speakerSummaries: speakerSummaries,
                actionItems: actionItems,
                transcript: fullText,
                createdAt: new Date().toISOString()
            };
            const aiFileName = `ai-analysis-${jobId}.json`;
            fs.writeFileSync(path.join(RESULTS_DIR, aiFileName), JSON.stringify(aiData, null, 2), 'utf8');

            return res.json({
                success: true,
                status: 'SUCCESS',
                summary: summaryContent,
                plainText: fullText,
                downloadUrl: `http://localhost:${PORT}/downloads/${fileName}`,
                transcriptDownloadUrl: `http://localhost:${PORT}/downloads/${transcriptFileName}`,
                aiDownloadUrl: `http://localhost:${PORT}/downloads/${aiFileName}`,
                aliyunUrls: {
                    transcriptionUrl: transcriptionUrl,
                    summarizationUrl: summarizationUrl
                },
                debugInfo: {
                    Summary: { Content: summaryContent }
                }
            });
        } else if (taskData.taskStatus === 'FAILED') {
            console.log(`❌ 任务失败: ${taskData.errorCode} - ${taskData.errorMessage}`);
            res.json({ success: true, status: 'FAILED', error: taskData.errorMessage, errorCode: taskData.errorCode });
        } else {
            res.json({ success: true, status: 'PROCESSING' });
        }
    } catch (err) {
        console.error('❌ 查询报错:', err.message);
        res.status(200).json({ success: true, status: 'ERROR', message: err.message });
    }
});

/**
 * 接口 C: 获取所有 AI 分析结果列表
 */
app.get('/api/tingwu/analyses', async (req, res) => {
    try {
        const files = fs.readdirSync(RESULTS_DIR)
            .filter(f => f.startsWith('ai-analysis-') && f.endsWith('.json'))
            .sort()
            .reverse();

        const analyses = files.map(f => {
            const filePath = path.join(RESULTS_DIR, f);
            const content = fs.readFileSync(filePath, 'utf8');
            try {
                const data = JSON.parse(content);
                return {
                    jobId: data.jobId,
                    summary: data.summary ? data.summary.substring(0, 100) + '...' : '暂无摘要',
                    chaptersCount: data.chapters?.length || 0,
                    actionItemsCount: data.actionItems?.length || 0,
                    speakersCount: data.speakerSummaries?.length || 0,
                    createdAt: data.createdAt,
                    hasMindMap: !!data.mindMap,
                    fileId: f.replace('ai-analysis-', '').replace('.json', '')
                };
            } catch (e) {
                return null;
            }
        }).filter(Boolean);

        res.json({ success: true, data: analyses });
    } catch (err) {
        console.error('❌ 获取分析列表失败:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 接口 D: 根据 jobId 获取单个 AI 分析详情
 */
app.get('/api/tingwu/analysis/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const filePath = path.join(RESULTS_DIR, `ai-analysis-${jobId}.json`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: '未找到分析结果' });
    }

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        res.json({ success: true, data: data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const server = app.listen(PORT, () => {
    console.log(`🚀 后端已启动: http://localhost:${PORT}`);
});

/**
 * 接口 E: 删除 AI 分析结果
 */
app.delete('/api/tingwu/analysis/:jobId', async (req, res) => {
    const { jobId } = req.params;
    
    try {
        // 删除 AI 分析 JSON 文件
        const aiFilePath = path.join(RESULTS_DIR, `ai-analysis-${jobId}.json`);
        if (fs.existsSync(aiFilePath)) {
            fs.unlinkSync(aiFilePath);
        }
        
        // 删除转写文本文件
        const transcriptFilePath = path.join(RESULTS_DIR, `transcript-${jobId}.txt`);
        if (fs.existsSync(transcriptFilePath)) {
            fs.unlinkSync(transcriptFilePath);
        }
        
        console.log(`🗑️ 删除分析结果: ${jobId}`);
        res.json({ success: true, message: '删除成功' });
        
    } catch (err) {
        console.error('❌ 删除失败:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

server.timeout = 600000;
server.keepAliveTimeout = 600000;