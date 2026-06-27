-- Demo data for local development only.
-- Do not run this seed in production.

insert into public.works (id, title, summary, cover_url, status, author_notice)
values
  (
    'beacon-beyond',
    '灯塔之外',
    '当远海灯塔在无月夜重启，你必须决定先救人，还是先保住真相。',
    '/parallel-assets/covers/beacon-beyond.jpg',
    'published',
    '读者请求会同步到作者端，作者确认后再发布更新。'
  ),
  (
    'rain-bridge',
    '雨夜桥边',
    '一段桥洞录像能洗清旧案，也会让证人永远消失。',
    '/parallel-assets/covers/rain-bridge.jpg',
    'published',
    '读者请求会同步到作者端，作者确认后再发布更新。'
  ),
  (
    'jade-contract',
    '玉京契书',
    '一纸婚契能稳住宗门，也会把主角推上替罪祭坛。',
    '/parallel-assets/covers/jade-contract.jpg',
    'published',
    '读者请求会同步到作者端，作者确认后再发布更新。'
  )
on conflict (id) do nothing;

insert into public.branches (id, work_id, branch_type, title, summary, status)
values
  ('beacon-beyond:main', 'beacon-beyond', 'main', '主线', '灯塔之外主线', 'published'),
  ('rain-bridge:main', 'rain-bridge', 'main', '主线', '雨夜桥边主线', 'published'),
  ('jade-contract:main', 'jade-contract', 'main', '主线', '玉京契书主线', 'published')
on conflict (id) do nothing;
