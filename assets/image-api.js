/* ======================================================================
 * [INPUT]: API 配置、模型名、提示词、参考图
 * [OUTPUT]: buildImageRequest/parseImageResponse 接口
 * [POS]: 生图请求与响应解析
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 * [UPDATED]: 2026-01-24
 * ====================================================================== */
(function () {
    const OPENAI_COMPATIBLE_KEYWORD = 'banana';

    function isOpenAiCompatibleModel(model) {
        return String(model || '').toLowerCase().includes(OPENAI_COMPATIBLE_KEYWORD);
    }

    function buildImageRequest({ apiUrl, apiKey, model, size, fullPrompt, refImage }) {
        const useOpenAi = isOpenAiCompatibleModel(model);
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };

        if (useOpenAi) {
            const requestBody = {
                model: model,
                prompt: fullPrompt,
                n: 1,
                size: size.replace(':', 'x'),
                response_format: 'url'
            };

            if (refImage) {
                requestBody.image = [refImage];
            }

            return {
                url: `${apiUrl}/v1/images/generations`,
                options: {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(requestBody)
                },
                protocol: 'OpenAI-Compatible'
            };
        }

        const nativeBody = {
            contents: [{ parts: [] }],
            generationConfig: { responseModalities: ["IMAGE", "TEXT"] }
        };

        if (refImage) {
            const base64Data = refImage.split(',')[1] || refImage;
            nativeBody.contents[0].parts.push({
                inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Data
                }
            });
        }

        nativeBody.contents[0].parts.push({ text: fullPrompt });

        if (size && size.includes(':')) {
            nativeBody.generationConfig.imageConfig = { aspectRatio: size };
        }

        return {
            url: `${apiUrl}/v1beta/models/${model}:generateContent`,
            options: {
                method: 'POST',
                headers,
                body: JSON.stringify(nativeBody)
            },
            protocol: 'Google-Native'
        };
    }

    function parseImageResponse(data) {
        if (data.candidates && data.candidates[0]?.content?.parts) {
            for (const part of data.candidates[0].content.parts) {
                if (!part.text) continue;
                const match = part.text.match(/https?:\/\/[^\s"]+\.(jpg|jpeg|png|gif|webp)/i);
                if (match) return match[0];
            }
        }

        if (data.data && data.data[0]?.url) {
            return data.data[0].url;
        }

        return null;
    }

    window.imageApi = {
        buildImageRequest,
        parseImageResponse,
        isOpenAiCompatibleModel
    };
})();
