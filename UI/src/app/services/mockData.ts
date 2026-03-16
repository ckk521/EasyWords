// 模拟LLM返回的数据
import { Word } from '../types/word';

// 模拟查词数据
export const mockWordData: Record<string, Omit<Word, 'id' | 'createdAt' | 'lastReviewedAt' | 'reviewCount'>> = {
  determine: {
    word: 'determine',
    phoneticUs: '/dɪˈtɜːrmɪn/',
    phoneticUk: '/dɪˈtɜːmɪn/',
    chineseDefinition: 'v. 决定；确定；查明',
    englishDefinition: 'to cause something to occur in a particular way; to be the decisive factor in',
    sentences: [
      { en: 'Several factors determine the success of the project.', zh: '几个因素决定了项目的成功。' },
      { en: 'We need to determine the cause of the problem.', zh: '我们需要查明问题的原因。' },
      { en: 'Your attitude will determine your success.', zh: '你的态度将决定你的成功。' },
      { en: 'Scientists are trying to determine how the disease spreads.', zh: '科学家们正在试图确定疾病的传播方式。' },
      { en: 'The committee will determine the winner next week.', zh: '委员会将在下周决定获胜者。' }
    ],
    synonyms: [
      { word: 'decide', difference: 'decide更强调做出选择或决断，determine更强调因果关系或最终结果', example: 'We need to decide by tomorrow.' },
      { word: 'establish', difference: 'establish强调确立或证实某事，determine更强调找出或确定', example: 'The research established a clear link.' },
      { word: 'ascertain', difference: 'ascertain是较正式的词，强调通过调查或研究来确定', example: 'We need to ascertain the facts.' },
      { word: 'resolve', difference: 'resolve强调解决或决心，determine更中性', example: 'She resolved to study harder.' }
    ]
  },
  brilliant: {
    word: 'brilliant',
    phoneticUs: '/ˈbrɪljənt/',
    phoneticUk: '/ˈbrɪljənt/',
    chineseDefinition: 'adj. 杰出的；光辉灿烂的；才华横溢的',
    englishDefinition: 'extremely clever or talented; very bright or shining',
    sentences: [
      { en: 'She has a brilliant mind for mathematics.', zh: '她在数学方面有杰出的才能。' },
      { en: 'The diamond reflected brilliant light.', zh: '钻石反射出灿烂的光芒。' },
      { en: "That's a brilliant idea!", zh: '那是个绝妙的主意！' },
      { en: 'He gave a brilliant performance in the concert.', zh: '他在音乐会上表现出色。' },
      { en: 'The scientist made a brilliant discovery.', zh: '这位科学家做出了杰出的发现。' }
    ],
    synonyms: [
      { word: 'excellent', difference: 'excellent更常用，brilliant更强调卓越和闪耀', example: 'The service was excellent.' },
      { word: 'outstanding', difference: 'outstanding强调超越常规，brilliant更强调才华和光芒', example: 'Her performance was outstanding.' },
      { word: 'genius', difference: 'genius通常作名词，brilliant更多用作形容词', example: 'He is a genius at chess.' },
      { word: 'superb', difference: 'superb强调极好的质量，brilliant更带有闪耀、聪明的含义', example: 'The food was superb.' }
    ]
  },
  eager: {
    word: 'eager',
    phoneticUs: '/ˈiːɡər/',
    phoneticUk: '/ˈiːɡə(r)/',
    chineseDefinition: 'adj. 渴望的；热切的；急切的',
    englishDefinition: 'strongly wanting to do or have something; enthusiastic',
    sentences: [
      { en: 'The students were eager to learn.', zh: '学生们渴望学习。' },
      { en: 'She was eager for success.', zh: '她渴望成功。' },
      { en: 'He gave an eager smile.', zh: '他露出热切的微笑。' },
      { en: 'They are eager to start the new project.', zh: '他们急于开始新项目。' },
      { en: 'The crowd was eager to hear the announcement.', zh: '人群急切地想听到公告。' }
    ],
    synonyms: [
      { word: 'enthusiastic', difference: 'enthusiastic强调热情洋溢，eager更强调急切渴望', example: 'She was enthusiastic about the plan.' },
      { word: 'keen', difference: 'keen在英式英语中更常用，意思相近', example: 'He is keen on sports.' },
      { word: 'anxious', difference: 'anxious带有焦虑不安的含义，eager更积极', example: 'She was anxious about the exam.' },
      { word: 'avid', difference: 'avid强调强烈的兴趣或欲望', example: 'He is an avid reader.' }
    ]
  }
};

// 模拟生成文章
export function generateMockArticle(words: string[], type: 'news' | 'story', length: 'short' | 'medium' | 'long'): string {
  const lengthMap = {
    short: 'short',
    medium: 'medium',
    long: 'long'
  };

  const boldWords = words.map(w => `**${w}**`).join(', ');
  
  if (type === 'news') {
    return `In the world of scientific research, several factors **determine** the success of groundbreaking projects. Scientists must possess **brilliant** minds and remain **eager** to push the boundaries of human knowledge.

Recent studies have shown that determination plays a crucial role in achieving significant breakthroughs. Researchers who demonstrate brilliant problem-solving skills often make the most impactful discoveries. Their eager pursuit of truth drives innovation across multiple disciplines.

The scientific community continues to emphasize the importance of these qualities in developing future leaders. Educational institutions are increasingly focused on nurturing brilliant young minds who are eager to tackle global challenges. This approach helps determine which students will become tomorrow's innovators.

${length === 'long' ? `Furthermore, the combination of determination, brilliance, and eagerness creates a powerful foundation for success. Many prominent scientists attribute their achievements to maintaining an eager attitude toward learning and discovery. Their brilliant contributions continue to determine the direction of scientific progress.

The future of research depends on cultivating these essential qualities in new generations of scientists. By encouraging brilliant thinking and eager exploration, we can determine the path toward solving humanity's greatest challenges.` : ''}`;
  } else {
    return `Emily stood at the entrance of the university library, **eager** to begin her research. She had spent months trying to **determine** the best approach for her thesis, and today she felt ready.

Her professor, Dr. Chen, had described her as having a **brilliant** analytical mind. This compliment made Emily even more determined to prove herself worthy of such praise. She was eager to demonstrate that her ideas could make a real difference.

As she settled into her favorite study corner, Emily began reviewing her notes. The challenge was to determine which variables would yield the most brilliant insights. Her eager anticipation grew with each page she turned.

${length === 'long' ? `Hours passed as Emily worked through complex data sets. Her brilliant deductions started forming a coherent pattern. She was eager to share her findings with Dr. Chen, knowing that his feedback would help determine the final direction of her research.

By evening, Emily had made significant progress. Her determination had paid off, revealing brilliant connections she hadn't noticed before. She felt eager to continue, knowing that each discovery would help determine the success of her academic journey.` : ''}

The library began to empty as closing time approached, but Emily's determination never wavered. She knew that her brilliant work and eager spirit would ultimately determine her future success.`;
  }
}
