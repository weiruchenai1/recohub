INSERT OR IGNORE INTO categories (key, label, sort_order) VALUES
('software', '软件推荐', 0),
('website', '网站推荐', 1);

INSERT OR IGNORE INTO items (category, name, url, note, sort_order) VALUES
('software', '7-Zip', 'https://www.7-zip.org/', '开源免费解压缩软件', 1),
('software', 'Cherry Studio', 'https://www.cherry-ai.com/', '多模型 AI 客户端', 2),
('software', 'Clash Party', 'https://clashparty.org/', '网络代理工具', 3),
('software', 'Cursor', 'https://www.cursor.com/', 'AI 辅助代码编辑器', 4),
('software', '格式工厂 (FormatFactory)', 'http://www.pcfreetime.com/formatfactory/cn/index.html', '万能格式转换工具', 5),
('software', '网易UU远程 (GameViewer)', 'https://gv.163.com/', '原GameViewer，网易远程控制', 6),
('software', 'Git', 'https://git-scm.com/downloads', '开发者版本控制工具', 7),
('software', '火绒安全', 'https://www.huorong.cn/', '轻量级杀毒软件，无广告', 8),
('software', 'Visual Studio Code', 'https://code.visualstudio.com/', '微软代码编辑器', 9),
('software', 'MuMu 模拟器', 'https://mumu.163.com/', '网易安卓手游模拟器', 10),
('software', 'Node.js', 'https://nodejs.org/zh-cn/', 'JavaScript 运行环境', 11),
('software', 'QQ (NT架构版)', 'https://im.qq.com/pcqq/', '基于 Electron 的新版 QQ', 12),
('software', '搜狗输入法', 'https://shurufa.sogou.com/', '中文输入法', 13),
('software', 'Steam', 'https://store.steampowered.com/about/', '全球最大游戏平台', 14),
('software', 'Watt Toolkit (Steam++)', 'https://steampp.net/', '开源游戏网络工具箱', 15),
('software', 'Telegram Desktop', 'https://desktop.telegram.org/', '即时通讯 (需网络环境)', 16),
('software', '微信 (Windows)', 'https://windows.weixin.qq.com/', '微信电脑版', 17),
('software', 'WizTree', 'https://diskanalyzer.com/', '极速磁盘空间分析工具', 18),
('software', 'WPS Office', 'https://www.wps.cn/', '金山办公软件', 19),
('software', '图吧工具箱', 'https://www.tbtool.cn/', '硬件检测工具合集', 20),
('website', 'GitHub', 'https://github.com/', '全球最大代码托管平台', 1);
