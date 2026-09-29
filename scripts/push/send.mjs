// 发「夜宵提醒」推送。GitHub Actions 定时运行（.github/workflows/night-push.yml），也可以手动：
//   node scripts/push/send.mjs [--force]
// 需要环境变量：PUSH_SUBSCRIPTION（App 里「夜宵提醒」生成的那段）、VAPID_PUBLIC_KEY、VAPID_PRIVATE_KEY
// PUSH_HOUR（多伦多时间几点发，默认 21）、PUSH_DAYS（哪几天发，0=周日…6=周六，默认每天）
import webpush from 'web-push';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
try { process.loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env')) } catch {}

const { PUSH_SUBSCRIPTION, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
if (!PUSH_SUBSCRIPTION || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) { console.error('缺少 PUSH_SUBSCRIPTION / VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY'); process.exit(1) }

// GitHub 的定时任务用 UTC，夏令时和冬令时差一小时，所以 cron 两个时刻都跑，这里只在多伦多正好是那个钟点时才发
const hour = +(process.env.PUSH_HOUR || 21), days = (process.env.PUSH_DAYS || '0,1,2,3,4,5,6').split(',').map(Number);
const now = new Date(), fmt = k => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Toronto', [k]: k === 'hour' ? 'numeric' : 'short', hourCycle: 'h23' }).format(now);
const torHour = +fmt('hour'), torDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(fmt('weekday'));
if (!process.argv.includes('--force') && (torHour !== hour || !days.includes(torDay))) { console.log(`多伦多现在 ${torHour} 点（星期 ${torDay}），不是发送时间，跳过`); process.exit(0) }

webpush.setVapidDetails('mailto:noreply@yyx061.github.io', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
const lines = ['🌙 今天要不要吃点夜宵？', '🌙 饿了吗？看看附近还开着的店', '🌙 夜宵时间到，来点热乎的？'];
const body = lines[now.getUTCDate() % lines.length];
try {
  const r = await webpush.sendNotification(JSON.parse(PUSH_SUBSCRIPTION), JSON.stringify({ title: '今天吃什么', body, url: './?night=1' }), { TTL: 3600 });
  console.log('已发送', r.statusCode);
} catch (e) {
  console.error('发送失败', e.statusCode, e.body || e.message);
  // 410/404：手机那边的订阅已经失效（关了提醒、删了 App），需要在 App 里重新开一次
  process.exit(e.statusCode === 410 || e.statusCode === 404 ? 0 : 1);
}
