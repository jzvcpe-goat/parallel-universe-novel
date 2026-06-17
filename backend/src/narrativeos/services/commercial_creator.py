from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from ..providers import LLMBackend, backend_debug_info


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _as_items(value: Any, fallback: list[Any]) -> list[Any]:
    if isinstance(value, list):
        cleaned = [item for item in value if item not in (None, "")]
        return cleaned or fallback
    return fallback


def _merge_dict(fallback: Dict[str, Any], generated: Any) -> Dict[str, Any]:
    merged = dict(fallback)
    if not isinstance(generated, dict):
        return merged
    for key, value in generated.items():
        if value in (None, ""):
            continue
        if isinstance(value, (list, dict)) and not value:
            continue
        merged[key] = value
    return merged


def _mode_for_provider(provider: Optional[str]) -> str:
    if provider == "deepseek":
        return "deepseek_assisted"
    if provider == "local" or provider is None:
        return "local_blueprint"
    return "llm_assisted"


class CommercialCreatorService:
    def __init__(self, llm_backend: Optional[LLMBackend] = None) -> None:
        self.llm_backend = llm_backend

    def build_blueprint(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        normalized = self._normalize_payload(payload)
        fallback = self._fallback_blueprint(normalized)
        ai_payload: Optional[Dict[str, Any]] = None
        model_status = {
            "mode": "local_blueprint",
            "provider": None,
            "generated_at": _utcnow(),
            "secret_exposure": "server_env_only",
        }

        if self.llm_backend is not None:
            try:
                generated = self.llm_backend.generate_json(
                    system_prompt=self._system_prompt(),
                    user_prompt=self._user_prompt(normalized),
                )
                if isinstance(generated, dict):
                    ai_payload = generated
                    route = backend_debug_info(self.llm_backend)
                    provider = route.get("selected_provider")
                    model_status = {
                        "mode": _mode_for_provider(provider),
                        "provider": provider,
                        "generated_at": _utcnow(),
                        "latency_ms": route.get("latency_ms"),
                        "secret_exposure": "server_env_only",
                    }
                    if provider == "local":
                        model_status["fallback_reason"] = "routed_to_local_fallback"
            except Exception as exc:  # noqa: BLE001 - model failures should degrade to a usable product flow
                model_status = {
                    "mode": "local_blueprint",
                    "provider": getattr(self.llm_backend, "provider_id", "llm"),
                    "generated_at": _utcnow(),
                    "fallback_reason": exc.__class__.__name__,
                    "secret_exposure": "server_env_only",
                }

        merged = self._merge_blueprint(fallback, ai_payload)
        merged["model_status"] = model_status
        merged["input_summary"] = {
            "creator_id": normalized["creator_id"],
            "genre": normalized["genre"],
            "audience": normalized["audience"],
            "commercial_goal": normalized["commercial_goal"],
            "seed": normalized["seed"],
        }
        return merged

    def _normalize_payload(self, payload: Dict[str, Any]) -> Dict[str, str]:
        return {
            "creator_id": str(payload.get("creator_id") or "first_author").strip()[:80],
            "pen_name": str(payload.get("pen_name") or "第一位作者").strip()[:80],
            "genre": str(payload.get("genre") or "都市悬疑").strip()[:80],
            "audience": str(payload.get("audience") or "18-35 岁，喜欢强钩子、快节奏、人物关系反转的付费读者").strip()[:180],
            "commercial_goal": str(payload.get("commercial_goal") or "做成可连载、可订阅、可改编的商业长篇").strip()[:180],
            "seed": str(payload.get("seed") or "一个普通人发现自己能看见别人选择后消失的平行人生。").strip()[:600],
            "tone": str(payload.get("tone") or "强钩子、强悬念、情感代价真实").strip()[:160],
            "platform": str(payload.get("platform") or "网页连载 + 会员订阅").strip()[:120],
        }

    def _system_prompt(self) -> str:
        return (
            "你是商业类型小说总编辑、网文产品经理和叙事质量评审。"
            "只输出 JSON，不要 Markdown。目标是帮助第一位真实用户从零开始创作一部可商业化连载作品。"
            "请避免空泛概念，必须给出能直接进入产品的作品定位、卖点、主线、角色、首章样稿和质量门禁。"
        )

    def _user_prompt(self, payload: Dict[str, str]) -> str:
        return (
            "请基于以下输入生成商业作品蓝图 JSON，字段必须包含："
            "work, world, characters, season_plan, chapter_one, quality_gate, launch_plan, next_actions。\n"
            f"作者ID：{payload['creator_id']}\n"
            f"笔名：{payload['pen_name']}\n"
            f"类型：{payload['genre']}\n"
            f"目标读者：{payload['audience']}\n"
            f"商业目标：{payload['commercial_goal']}\n"
            f"平台：{payload['platform']}\n"
            f"语气：{payload['tone']}\n"
            f"种子想法：{payload['seed']}\n"
            "chapter_one.body 请写 700-1000 字中文开场，必须有开场钩子、主角缺口、第一选择点。"
        )

    def _fallback_blueprint(self, payload: Dict[str, str]) -> Dict[str, Any]:
        title = "消失选择档案"
        return {
            "work": {
                "title": title,
                "logline": "一名失败的商业策划师发现每个选择都会留下可追踪的平行档案，他必须把别人的命运裂缝变成自己翻盘的作品。",
                "genre": payload["genre"],
                "target_readers": payload["audience"],
                "core_hook": "选择可视化 + 都市悬疑案件 + 创作者自救。",
                "commercial_format": "首季 30 章免费试读，后续会员订阅；每 5 章一个选择裂点。",
            },
            "world": {
                "rule": "每个重大选择都会在城市里留下一个只有主角能读取的“选择档案”。档案不能直接改命，只能暴露代价。",
                "opening_location": "凌晨两点的共享办公室、停运地铁站、旧楼广告屏。",
                "first_choice_point": "公开客户死亡前的选择档案，还是先把它写成连载开场换取第一批付费读者？",
            },
            "characters": [
                {
                    "name": "林岑",
                    "role": "主角 / 失业商业策划师",
                    "desire": "用一部作品证明自己不是只能做廉价方案的人。",
                    "flaw": "总把人的痛苦先当成素材。",
                },
                {
                    "name": "许照夜",
                    "role": "调查记者",
                    "desire": "找到选择档案背后的第一名失踪者。",
                    "flaw": "不相信创作者会尊重真相。",
                },
                {
                    "name": "周临川",
                    "role": "平台增长负责人",
                    "desire": "把选择档案包装成爆款互动连载。",
                    "flaw": "愿意为了增长压低真相成本。",
                },
            ],
            "season_plan": [
                "第 1-5 章：发现选择档案，完成第一个付费钩子。",
                "第 6-12 章：读者选择开始影响案件公开顺序。",
                "第 13-22 章：平台增长与现实伦理冲突升级。",
                "第 23-30 章：主角必须决定作品爆款和失踪者真相谁先活下来。",
            ],
            "chapter_one": {
                "title": "第 1 章 你本来会死在今晚",
                "body": (
                    "林岑第一次看见选择档案，是在凌晨两点十七分。\n\n"
                    "共享办公室只剩他一个人。投影幕上还停着被客户退回来的方案，标题写着《互动悬疑商业化增长路径》，下面的批注只有四个字：没有灵魂。\n\n"
                    "他盯着那四个字看了很久，直到手机震动。客户周临川发来一条语音，背景里有风声和地铁报站声。\n\n"
                    "“林岑，如果你真想做出能让人付费的故事，就别再写那些安全的东西。”\n\n"
                    "语音到这里断掉。三秒后，办公室外那块旧广告屏忽然亮了。屏幕没有播放广告，只显示一行细白的字：周临川，本应死于今晚 02:21。\n\n"
                    "林岑以为自己困出幻觉。可广告屏继续刷新，像一份被城市吐出来的档案。\n\n"
                    "选择一：走进停运地铁站，代价是失去最后一个证人。\n选择二：拨通林岑电话，代价是把故事交给一个失败者。\n\n"
                    "他后背一寸寸凉下去。手机里的语音不是求助，而是周临川在死亡前做出的第二个选择。\n\n"
                    "四分钟后，平台热搜弹出新闻：某内容公司高管坠入停运地铁施工井，生死不明。\n\n"
                    "林岑站在空荡荡的办公室里，突然明白自己得到的不是灵感，而是一条可以卖钱、也可以害死人的裂缝。"
                ),
                "first_choice": "立刻报警公开档案，还是先写下第一章锁住证据？",
            },
            "quality_gate": {
                "score": 86,
                "pass": True,
                "checks": [
                    {"label": "开场钩子", "score": 92, "note": "死亡预告和商业失败同时成立。"},
                    {"label": "商业卖点", "score": 88, "note": "选择档案可以持续生成互动章节。"},
                    {"label": "人物缺口", "score": 84, "note": "主角有素材伦理问题，可推动长期成长。"},
                    {"label": "连载节奏", "score": 82, "note": "第 1 章末尾有明确选择点。"},
                ],
                "release_decision": "可进入首批读者测试，但需要补 3 个章节标题和付费断点。",
            },
            "launch_plan": {
                "pricing": "前 3 章免费，会员每月 29 元解锁互动分支和作者手记。",
                "first_week_goal": "完成 30 名种子读者阅读，收集每章选择率和完读率。",
                "metric": "首章完读率、第一次选择点击率、收藏率、付费前置页点击率。",
            },
            "next_actions": [
                "确认作品标题和一句话卖点。",
                "生成第 2-5 章标题与每章选择点。",
                "用 10 名种子读者测试首章钩子。",
            ],
        }

    def _merge_blueprint(self, fallback: Dict[str, Any], generated: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        if generated is None:
            return fallback
        return {
            "work": _merge_dict(fallback["work"], generated.get("work")),
            "world": _merge_dict(fallback["world"], generated.get("world")),
            "characters": _as_items(generated.get("characters"), fallback["characters"]),
            "season_plan": _as_items(generated.get("season_plan"), fallback["season_plan"]),
            "chapter_one": _merge_dict(fallback["chapter_one"], generated.get("chapter_one")),
            "quality_gate": _merge_dict(fallback["quality_gate"], generated.get("quality_gate")),
            "launch_plan": _merge_dict(fallback["launch_plan"], generated.get("launch_plan")),
            "next_actions": _as_items(generated.get("next_actions"), fallback["next_actions"]),
        }
