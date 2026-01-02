#!/usr/bin/env bash
# INPUT: 仓库内可读文本文件
# OUTPUT: 头部注释完整性检查结果
# POS: 文档一致性校验脚本
# UPDATE: 一旦我被更新，务必更新我的开头注释，以及所属的文件夹的md。
# UPDATED: 2026-01-02

set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

fail=0

while IFS= read -r file; do
    case "$file" in
        *.md|*.html|*.css|*.js|*.txt|*.sh|*.svg|.gitignore) ;;
        *) continue ;;
    esac

    head="$(sed -n '1,40p' "$file")"
    for tag in "INPUT:" "OUTPUT:" "POS:" "UPDATE:" "UPDATED:"; do
        if ! printf '%s' "$head" | grep -q "$tag"; then
            echo "Missing $tag in $file"
            fail=1
        fi
    done
done < <(git ls-files)

if [ "$fail" -ne 0 ]; then
    exit 1
fi

echo "Header check passed."
