from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict, List

from ..persistence.repositories import SQLAlchemyPlatformRepository
from ..worldpacks.models import WorldPack, WorldVersion


FRONTEND_READER_WORLDS: Dict[str, Dict[str, Any]] = {
    "beacon-beyond": {
        "title": "灯塔之外",
        "source_world_id": "urban_mystery_lotus_lane",
        "genres": ["玄幻悬疑", "互动连载"],
        "premise": "第七灯塔在无月夜亮起，潮汐档案室里多出一页不存在的航海日志。",
        "locations": ["北境雾港", "第七灯塔", "潮汐档案室"],
    },
    "rain-bridge": {
        "title": "雨夜桥边",
        "source_world_id": "urban_mystery_lotus_lane",
        "genres": ["都市谜案", "互动连载"],
        "premise": "一段桥洞录像像能洗清旧案，也会让证人永远消失。",
        "locations": ["旧桥洞", "雨夜街口", "证物室"],
    },
    "jade-contract": {
        "title": "玉京契书",
        "source_world_id": "xianxia_forgotten_vow",
        "genres": ["仙侠权谋", "互动连载"],
        "premise": "承认伪证能稳住宗门，毁契却能证明自身清白。",
        "locations": ["玉京宗门", "契书阁", "问心台"],
    },
    "lotus-lane": {
        "title": "莲巷来信",
        "source_world_id": "urban_mystery_lotus_lane",
        "genres": ["情感成长", "互动连载"],
        "premise": "一封迟到七年的信，让每一次回复都变成另一种人生。",
        "locations": ["莲巷", "旧邮局", "雨后天台"],
    },
    "frontier-edict": {
        "title": "边城密诏",
        "source_world_id": "jade_court_exam",
        "genres": ["历史权谋", "互动连载"],
        "premise": "遵诏开城能保军民性命，抗诏死守能保忠义名声，却可能让全城陪葬。",
        "locations": ["边城城门", "军帐", "烽火台"],
    },
    "algorithm-city": {
        "title": "算法城市",
        "source_world_id": "synthetic_min_pack",
        "genres": ["脑洞科幻", "互动连载"],
        "premise": "公开记忆差异会触发清除程序，删除备份能保命，却会让身份真相永远消失。",
        "locations": ["记忆备份中心", "算法审判厅", "无人轻轨站"],
    },
}


def _frontend_worldpack_payload(repository: SQLAlchemyPlatformRepository, world_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
    source = repository.registry.get_published_world(config["source_world_id"])["worldpack"]
    payload = deepcopy(source)
    payload["world_id"] = world_id
    payload["title"] = config["title"]
    payload["version"] = config.get("version", "0.1.0")

    manifest = dict(payload.get("manifest") or {})
    manifest["genres"] = list(config["genres"])
    manifest["author_id"] = manifest.get("author_id") or "parallel_universe_product"
    payload["manifest"] = manifest

    world_bible = dict(payload.get("world_bible") or {})
    world_bible["premise"] = config["premise"]
    world_bible["locations"] = list(config["locations"])
    world_bible.setdefault("canon_rules", ["选择必须带来可见代价", "人物关系会记住关键决定"])
    world_bible.setdefault("forbidden_moves", ["没有代价的反转", "无视已发生选择的续写"])
    payload["world_bible"] = world_bible

    metadata = dict(payload.get("metadata") or {})
    metadata.update(
        {
            "frontend_product_world": True,
            "source_world_id": config["source_world_id"],
            "compatibility_reason": "current_vite_reader_entry",
        }
    )
    payload["metadata"] = metadata
    return payload


def ensure_frontend_reader_worlds(repository: SQLAlchemyPlatformRepository) -> List[str]:
    registered: List[str] = []
    for world_id, config in FRONTEND_READER_WORLDS.items():
        payload = _frontend_worldpack_payload(repository, world_id, config)
        worldpack = WorldPack.from_dict(payload)
        world_version = WorldVersion.from_worldpack(
            worldpack=worldpack,
            world_version_id="%s@%s" % (worldpack.world_id, worldpack.version),
            status="published",
        )
        repository.save_world_version(world_version, publish=True)
        registered.append(world_id)
    return registered
