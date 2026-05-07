import type { Anime } from '../types';

// 差异化视频源池 — 国内可访问CDN，8组不同排列确保每个动漫有不同的视频组合
const SOURCE_POOL = [
  [{ label:'蓝光 1080p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'主线路' },{ label:'高清 720p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'备用线路1' },{ label:'标清 480p', url:'https://media.w3.org/2010/05/sintel/sintel-480p.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'CDN加速' }],
  [{ label:'蓝光 1080p', url:'http://vjs.zencdn.net/v/oceans.mp4', server:'主线路' },{ label:'高清 720p', url:'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server:'备用线路1' },{ label:'标清 480p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'CDN加速' }],
  [{ label:'蓝光 1080p', url:'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server:'主线路' },{ label:'高清 720p', url:'http://vjs.zencdn.net/v/oceans.mp4', server:'备用线路1' },{ label:'标清 480p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'CDN加速' }],
  [{ label:'蓝光 1080p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'主线路' },{ label:'高清 720p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'备用线路1' },{ label:'标清 480p', url:'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'http://vjs.zencdn.net/v/oceans.mp4', server:'CDN加速' }],
  [{ label:'蓝光 1080p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'主线路' },{ label:'高清 720p', url:'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server:'备用线路1' },{ label:'标清 480p', url:'http://vjs.zencdn.net/v/oceans.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'CDN加速' }],
  [{ label:'蓝光 1080p', url:'http://vjs.zencdn.net/v/oceans.mp4', server:'主线路' },{ label:'高清 720p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'备用线路1' },{ label:'标清 480p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server:'CDN加速' }],
  [{ label:'蓝光 1080p', url:'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server:'主线路' },{ label:'高清 720p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'备用线路1' },{ label:'标清 480p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'http://vjs.zencdn.net/v/oceans.mp4', server:'CDN加速' }],
  [{ label:'蓝光 1080p', url:'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4', server:'主线路' },{ label:'高清 720p', url:'http://www.w3school.com.cn/example/html5/mov_bbb.mp4', server:'备用线路1' },{ label:'标清 480p', url:'http://vjs.zencdn.net/v/oceans.mp4', server:'备用线路2' },{ label:'流畅 360p', url:'https://media.w3.org/2010/05/sintel/trailer.mp4', server:'CDN加速' }],
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) { h = ((h << 5) - h) + id.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function genEpisodes(count: number, animeId: string): Anime['episodes'] {
  const idNum = parseInt(animeId) || hashId(animeId);
  return Array.from({ length: count }, (_, i) => ({
    id: `${animeId}-ep${i + 1}`,
    num: i + 1,
    title: `第${i + 1}集`,
    thumbnail: `https://picsum.photos/seed/${animeId}ep${i + 1}/320/180`,
    sources: SOURCE_POOL[(idNum + i) % SOURCE_POOL.length],
  }));
}

const animeList: Anime[] = [
  {
    id: '1', title: '星辰变', cover: 'https://picsum.photos/seed/anime1/400/560', banner: 'https://picsum.photos/seed/ban1/800/400',
    year: 2026, genres: ['动作', '奇幻', '冒险'], synopsis: '少年秦羽天生无法修炼内功，却凭借惊人毅力走上了一条独特的修炼之路。在星辰阁的试炼中，他意外获得了远古传承，从此开启了逆天改命的传奇旅程。',
    rating: 9.2, episodes: genEpisodes(24, '1'), isNew: true, status: 'airing', updatedAt: '2026-05-05',
  },
  {
    id: '2', title: '深海纪元', cover: 'https://picsum.photos/seed/anime2/400/560', banner: 'https://picsum.photos/seed/ban2/800/400',
    year: 2026, genres: ['科幻', '冒险', '悬疑'], synopsis: '公元2150年，人类在深海发现了神秘文明遗迹。一支由科学家和军人组成的探险队深入海底，却意外揭开了一个足以毁灭世界的秘密。',
    rating: 8.9, episodes: genEpisodes(12, '2'), isNew: true, status: 'airing', updatedAt: '2026-05-04',
  },
  {
    id: '3', title: '剑道独尊', cover: 'https://picsum.photos/seed/anime3/400/560', banner: 'https://picsum.photos/seed/ban3/800/400',
    year: 2025, genres: ['动作', '奇幻', '冒险'], synopsis: '剑道天才叶尘在宗门大比中意外陨落，却重生回到少年时代。带着前世记忆，他誓要踏上剑道巅峰，斩尽前世仇敌。',
    rating: 9.0, episodes: genEpisodes(36, '3'), status: 'completed', updatedAt: '2025-12-20',
  },
  {
    id: '4', title: '甜蜜陷阱', cover: 'https://picsum.photos/seed/anime4/400/560', banner: 'https://picsum.photos/seed/ban4/800/400',
    year: 2025, genres: ['恋爱', '喜剧', '校园'], synopsis: '学霸林小棠为了还债，假扮成校草的女朋友。一场始于谎言的恋情，却在朝夕相处中悄然绽放。',
    rating: 8.5, episodes: genEpisodes(12, '4'), status: 'completed', updatedAt: '2025-11-15',
  },
  {
    id: '5', title: '无限神域', cover: 'https://picsum.photos/seed/anime5/400/560', banner: 'https://picsum.photos/seed/ban5/800/400',
    year: 2025, genres: ['科幻', '动作', '冒险'], synopsis: '一款神秘的全息游戏"神域"席卷全球，玩家们发现游戏中的死亡竟然会映射到现实。高中生陆离被卷入这场致命游戏，必须通关才能活命。',
    rating: 9.1, episodes: genEpisodes(24, '5'), isNew: true, status: 'airing', updatedAt: '2026-04-28',
  },
  {
    id: '6', title: '樱花庄的日常', cover: 'https://picsum.photos/seed/anime6/400/560', banner: 'https://picsum.photos/seed/ban6/800/400',
    year: 2024, genres: ['喜剧', '校园', '日常'], synopsis: '一群性格迥异的年轻人住进了名为"樱花庄"的合租公寓，每天上演着温馨又有趣的日常故事。',
    rating: 8.7, episodes: genEpisodes(24, '6'), status: 'completed', updatedAt: '2024-06-30',
  },
  {
    id: '7', title: '暗夜协奏曲', cover: 'https://picsum.photos/seed/anime7/400/560', banner: 'https://picsum.photos/seed/ban7/800/400',
    year: 2024, genres: ['悬疑', '恐怖', '奇幻'], synopsis: '音乐学院发生连环失踪案，天才小提琴手白夜发现每起失踪都与一首古老的乐谱有关。追踪真相的过程中，他逐渐陷入了超自然的漩涡。',
    rating: 8.4, episodes: genEpisodes(12, '7'), status: 'completed', updatedAt: '2024-10-15',
  },
  {
    id: '8', title: '机甲风暴', cover: 'https://picsum.photos/seed/anime8/400/560', banner: 'https://picsum.photos/seed/ban8/800/400',
    year: 2024, genres: ['科幻', '机甲', '动作'], synopsis: '外星入侵者降临地球，少年机师林峰驾驶着人类最后的希望——"苍穹"机甲，与伙伴们一同对抗外星威胁。',
    rating: 8.8, episodes: genEpisodes(36, '8'), status: 'completed', updatedAt: '2024-03-20',
  },
  {
    id: '9', title: '灵笼：复苏', cover: 'https://picsum.photos/seed/anime9/400/560', banner: 'https://picsum.photos/seed/ban9/800/400',
    year: 2024, genres: ['科幻', '动作', '悬疑'], synopsis: '末日废土世界，人类在巨大的移动堡垒"灯塔"上苟延残喘。一名年轻的猎荒者踏上了寻找旧世界秘密的危险旅程。',
    rating: 9.0, episodes: genEpisodes(16, '9'), status: 'completed', updatedAt: '2024-08-10',
  },
  {
    id: '10', title: '食神的后裔', cover: 'https://picsum.photos/seed/anime10/400/560', banner: 'https://picsum.photos/seed/ban10/800/400',
    year: 2023, genres: ['喜剧', '奇幻', '美食'], synopsis: '普通大学生李凡意外继承了食神的灵力，做出的料理能够让人获得神奇的能力。从此他的人生变成了一场美食与冒险的盛宴。',
    rating: 8.3, episodes: genEpisodes(24, '10'), status: 'completed', updatedAt: '2023-12-01',
  },
  {
    id: '11', title: '勇者传说', cover: 'https://picsum.photos/seed/anime11/400/560', banner: 'https://picsum.photos/seed/ban11/800/400',
    year: 2023, genres: ['奇幻', '冒险', '动作'], synopsis: '平凡的少年艾伦被选为传说中的勇者，踏上讨伐魔王的旅程。然而他很快发现，所谓"魔王"的真相远比想象中复杂。',
    rating: 8.6, episodes: genEpisodes(24, '11'), status: 'completed', updatedAt: '2023-09-20',
  },
  {
    id: '12', title: '月色真美', cover: 'https://picsum.photos/seed/anime12/400/560', banner: 'https://picsum.photos/seed/ban12/800/400',
    year: 2023, genres: ['恋爱', '校园', '日常'], synopsis: '高三学生小野寺和佐藤在图书馆的一次偶遇，开启了一段青涩而美好的初恋。两个不善言辞的人，用行动诠释着最纯粹的爱情。',
    rating: 9.3, episodes: genEpisodes(12, '12'), status: 'completed', updatedAt: '2023-06-15',
  },
  {
    id: '13', title: '猎魔人异闻录', cover: 'https://picsum.photos/seed/anime13/400/560', banner: 'https://picsum.photos/seed/ban13/800/400',
    year: 2023, genres: ['动作', '恐怖', '奇幻'], synopsis: '在妖魔横行的世界里，猎魔人是人类唯一的希望。年轻的猎魔人学徒凯尔在一次任务中发现了妖魔起源的秘密。',
    rating: 8.5, episodes: genEpisodes(12, '13'), status: 'completed', updatedAt: '2023-04-10',
  },
  {
    id: '14', title: '落第骑士英雄谭', cover: 'https://picsum.photos/seed/anime14/400/560', banner: 'https://picsum.photos/seed/ban14/800/400',
    year: 2023, genres: ['动作', '奇幻', '校园'], synopsis: '被称为"落第骑士"的黑铁一辉，在魔法骑士学院中是最弱的存在。但他凭借着惊人的战术头脑和不屈的意志，战胜了一个又一个强敌。',
    rating: 8.2, episodes: genEpisodes(12, '14'), status: 'completed', updatedAt: '2023-01-28',
  },
  {
    id: '15', title: '破灭之刃', cover: 'https://picsum.photos/seed/anime15/400/560', banner: 'https://picsum.photos/seed/ban15/800/400',
    year: 2022, genres: ['动作', '奇幻', '冒险'], synopsis: '少年炭治郎的家人被鬼杀害，唯一幸存的妹妹却变成了鬼。为了找到让妹妹恢复的方法，他加入了鬼杀队，踏上了斩鬼之旅。',
    rating: 9.5, episodes: genEpisodes(26, '15'), status: 'completed', updatedAt: '2022-09-25',
  },
  {
    id: '16', title: '异能高校', cover: 'https://picsum.photos/seed/anime16/400/560', banner: 'https://picsum.photos/seed/ban16/800/400',
    year: 2022, genres: ['科幻', '校园', '动作'], synopsis: '一所专门培养超能力者的秘密高校中，少年方辰发现自己拥有复制他人能力的特殊异能。围绕这份力量的争夺与阴谋随之展开。',
    rating: 8.4, episodes: genEpisodes(24, '16'), status: 'completed', updatedAt: '2022-07-12',
  },
  {
    id: '17', title: '海贼：无尽航路', cover: 'https://picsum.photos/seed/anime17/400/560', banner: 'https://picsum.photos/seed/ban17/800/400',
    year: 2022, genres: ['冒险', '动作', '喜剧'], synopsis: '少年路飞梦想成为海贼王，他召集了一群志同道合的伙伴，驾驶着"阳光号"航行在广阔的大海上，追寻传说中的大秘宝。',
    rating: 9.4, episodes: genEpisodes(48, '17'), status: 'completed', updatedAt: '2022-12-30',
  },
  {
    id: '18', title: '魔法少女的忧郁', cover: 'https://picsum.photos/seed/anime18/400/560', banner: 'https://picsum.photos/seed/ban18/800/400',
    year: 2022, genres: ['奇幻', '日常', '喜剧'], synopsis: '普通初中生小圆被神秘生物选中成为魔法少女，但成为魔法少女后的生活远没有她想象的那么美好。每天都要和魔女战斗，还要兼顾学业……',
    rating: 8.1, episodes: genEpisodes(12, '18'), status: 'completed', updatedAt: '2022-05-20',
  },
  {
    id: '19', title: '国术无双', cover: 'https://picsum.photos/seed/anime19/400/560', banner: 'https://picsum.photos/seed/ban19/800/400',
    year: 2022, genres: ['动作', '体育', '校园'], synopsis: '武术世家传人张北辰进入现代都市的大学，用传统武术在现代格斗大赛中闯出名堂，也让古老国术焕发新生。',
    rating: 8.6, episodes: genEpisodes(24, '19'), status: 'completed', updatedAt: '2022-03-15',
  },
  {
    id: '20', title: '异世界悠闲生活', cover: 'https://picsum.photos/seed/anime20/400/560', banner: 'https://picsum.photos/seed/ban20/800/400',
    year: 2021, genres: ['奇幻', '喜剧', '日常'], synopsis: '社畜加班猝死后转生到异世界，这一次他决定不再拼命工作，而是开一家小店，过上慢节奏的悠闲生活。但客人们似乎都不是普通人……',
    rating: 8.8, episodes: genEpisodes(12, '20'), status: 'completed', updatedAt: '2021-11-30',
  },
  {
    id: '21', title: '星灵纪元', cover: 'https://picsum.photos/seed/anime21/400/560', banner: 'https://picsum.photos/seed/ban21/800/400',
    year: 2021, genres: ['科幻', '奇幻', '冒险'], synopsis: '人类已经进入星际时代，一种名为"星灵"的能量生物被发现。少年陈星意外与一只星灵缔结了契约，卷入了一场星际阴谋。',
    rating: 8.3, episodes: genEpisodes(36, '21'), status: 'completed', updatedAt: '2021-08-20',
  },
  {
    id: '22', title: '推理之绊', cover: 'https://picsum.photos/seed/anime22/400/560', banner: 'https://picsum.photos/seed/ban22/800/400',
    year: 2021, genres: ['悬疑', '校园', '日常'], synopsis: '高中生侦探社的成员们在一系列离奇案件中成长。每个案件背后都隐藏着人性的真相，而最大的谜团或许就在他们身边。',
    rating: 8.5, episodes: genEpisodes(24, '22'), status: 'completed', updatedAt: '2021-05-10',
  },
  {
    id: '23', title: '篮球少年', cover: 'https://picsum.photos/seed/anime23/400/560', banner: 'https://picsum.photos/seed/ban23/800/400',
    year: 2021, genres: ['体育', '校园', '动作'], synopsis: '身高只有168cm的少年林翔梦想成为职业篮球选手。凭借着过人的速度和精准的三分球，他在高中篮球界掀起了风暴。',
    rating: 8.7, episodes: genEpisodes(24, '23'), status: 'completed', updatedAt: '2021-02-28',
  },
  {
    id: '24', title: '命运石之门0', cover: 'https://picsum.photos/seed/anime24/400/560', banner: 'https://picsum.photos/seed/ban24/800/400',
    year: 2020, genres: ['科幻', '悬疑', '冒险'], synopsis: '大学生冈部伦太郎偶然发明了可以向过去发送邮件的时间机器。每次改变过去，未来都变得更加扭曲。他必须在无数条世界线中找到唯一的希望。',
    rating: 9.1, episodes: genEpisodes(24, '24'), status: 'completed', updatedAt: '2020-12-25',
  },
  {
    id: '25', title: '妖狐传说', cover: 'https://picsum.photos/seed/anime25/400/560', banner: 'https://picsum.photos/seed/ban25/800/400',
    year: 2020, genres: ['奇幻', '恋爱', '冒险'], synopsis: '人类女孩与千年妖狐的禁忌之恋。跨越种族的感情，在人与妖的纷争中经受着重重考验。',
    rating: 8.4, episodes: genEpisodes(24, '25'), status: 'completed', updatedAt: '2020-09-18',
  },
  {
    id: '26', title: '电竞之王', cover: 'https://picsum.photos/seed/anime26/400/560', banner: 'https://picsum.photos/seed/ban26/800/400',
    year: 2020, genres: ['体育', '科幻', '校园'], synopsis: '天才电竞少年叶修被俱乐部驱逐后，从网吧开始重新征战职业联赛。他的目标是——冠军！',
    rating: 9.0, episodes: genEpisodes(36, '26'), status: 'completed', updatedAt: '2020-06-30',
  },
  {
    id: '27', title: '银魂：终章', cover: 'https://picsum.photos/seed/anime27/400/560', banner: 'https://picsum.photos/seed/ban27/800/400',
    year: 2019, genres: ['喜剧', '动作', '科幻'], synopsis: '在江户时代的末期，外星人入侵地球。武士坂田银时经营着一家"万事屋"，用他的方式守护着身边的人和这座城市。',
    rating: 9.3, episodes: genEpisodes(12, '27'), status: 'completed', updatedAt: '2019-12-31',
  },
  {
    id: '28', title: '寄生兽：生命的准则', cover: 'https://picsum.photos/seed/anime28/400/560', banner: 'https://picsum.photos/seed/ban28/800/400',
    year: 2018, genres: ['科幻', '恐怖', '动作'], synopsis: '不明生物"寄生兽"入侵地球，它们夺取人类的大脑来控制身体。高中生新一右手被寄生，却与寄生生物形成了奇妙的共生关系。',
    rating: 8.9, episodes: genEpisodes(24, '28'), status: 'completed', updatedAt: '2018-12-20',
  },
  {
    id: '29', title: '虫师续章', cover: 'https://picsum.photos/seed/anime29/400/560', banner: 'https://picsum.photos/seed/ban29/800/400',
    year: 2017, genres: ['奇幻', '悬疑', '日常'], synopsis: '在这个世界中存在着一种名为"虫"的神秘生物。虫师银古游历各地，解决由"虫"引发的各种奇异事件。',
    rating: 9.2, episodes: genEpisodes(12, '29'), status: 'completed', updatedAt: '2017-10-15',
  },
  {
    id: '30', title: '灌篮高手：全国大赛', cover: 'https://picsum.photos/seed/anime30/400/560', banner: 'https://picsum.photos/seed/ban30/800/400',
    year: 2015, genres: ['体育', '校园', '喜剧'], synopsis: '湘北高中篮球队在全国大赛中迎战最强对手山王工业。流川枫、樱木花道等人的热血青春，在这一刻燃烧到极致。',
    rating: 9.8, episodes: genEpisodes(24, '30'), status: 'completed', updatedAt: '2015-07-10',
  },
  {
    id: '31', title: '蒸汽朋克物语', cover: 'https://picsum.photos/seed/anime31/400/560', banner: 'https://picsum.photos/seed/ban31/800/400',
    year: 2010, genres: ['科幻', '奇幻', '冒险'], synopsis: '在一个由蒸汽科技主导的平行世界里，少女机械师艾米莉乘坐自制的飞行船，踏上了寻找失踪父亲的大冒险。',
    rating: 8.2, episodes: genEpisodes(24, '31'), status: 'completed', updatedAt: '2010-12-25',
  },
  {
    id: '32', title: '战国英雄传', cover: 'https://picsum.photos/seed/anime32/400/560', banner: 'https://picsum.photos/seed/ban32/800/400',
    year: 2005, genres: ['动作', '历史', '冒险'], synopsis: '以日本战国时代为背景，讲述了一群年轻武士在乱世中成长、战斗，最终成为一代名将的史诗故事。',
    rating: 8.0, episodes: genEpisodes(48, '32'), status: 'completed', updatedAt: '2005-03-31',
  },
];

export function getMockAnimeList(page = 1, limit = 20) {
  const start = (page - 1) * limit;
  const data = animeList.slice(start, start + limit);
  return { data, hasMore: start + limit < animeList.length };
}

export function getMockAnimeById(id: string): Anime | undefined {
  return animeList.find(a => a.id === id);
}

export function getMockAnimeByGenre(genre: string, page = 1, limit = 20) {
  const filtered = genre === '全部'
    ? animeList
    : animeList.filter(a => a.genres.includes(genre));
  const start = (page - 1) * limit;
  return { data: filtered.slice(start, start + limit), hasMore: start + limit < filtered.length };
}

export function getMockAnimeByYear(year: number, page = 1, limit = 20) {
  const filtered = year === 0 ? animeList : animeList.filter(a => a.year === year);
  const start = (page - 1) * limit;
  return { data: filtered.slice(start, start + limit), hasMore: start + limit < filtered.length };
}

export function searchMockAnime(query: string): Anime[] {
  const q = query.toLowerCase();
  return animeList.filter(a => a.title.toLowerCase().includes(q) || a.synopsis.toLowerCase().includes(q));
}

export function getMockRecommendations(currentId: string, count = 10): Anime[] {
  return animeList.filter(a => a.id !== currentId).sort(() => Math.random() - 0.5).slice(0, count);
}

export function getMockRecentUpdates(count = 10): Anime[] {
  return [...animeList].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, count);
}

export function getMockTrending(count = 10): Anime[] {
  return [...animeList].sort((a, b) => b.rating - a.rating).slice(0, count);
}

export function getMockFollowing(ids: string[]): Anime[] {
  return animeList.filter(a => ids.includes(a.id));
}
