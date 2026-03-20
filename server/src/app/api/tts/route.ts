/**
 * TTS API - 文字转语音
 * POST /api/tts
 */

import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/lib/tts';

export async function POST(request: NextRequest) {
  try {
    const { text, lang = 'en-US', speaker = 'A', speed = 0.9 } = await request.json();

    if (!text) {
      return NextResponse.json({ error: '请提供文本' }, { status: 400 });
    }

    if (text.length > 500) {
      return NextResponse.json({ error: '文本过长，最多500字符' }, { status: 400 });
    }

    const result = await synthesizeSpeech({ text, lang, speaker, speed });

    // Buffer 转 Base64
    const audioBase64 = result.audioData.toString('base64');

    return NextResponse.json({
      success: true,
      audio: audioBase64,
      format: result.format,
    });
  } catch (error: any) {
    console.error('TTS 错误:', error);
    return NextResponse.json({ error: error.message || '语音合成失败' }, { status: 500 });
  }
}
