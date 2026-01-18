# 市場休盤邏輯優化 - 實施計劃

## 背景問題

目前系統在週末（市場關閉時）會出現價格跳動，原因是：
1. 不同數據源（Yahoo vs Sina）返回的「收盤價」存在差異
2. 系統持續進行多來源聚合，加權平均產生微小波動

## 目標

1. **週末靜止**：市場關閉時，價格應完全靜止，不因聚合差異而跳動
2. **權威來源**：使用市場公認的權威來源作為收盤價
3. **正確狀態**：前端顯示正確的「停盤」狀態與「上次更新：- 毫秒前」

---

## 實施步驟

### Phase 1: 移除 Sina 對期貨的支援

**目的**：期貨只使用 Yahoo (CME 官方結算價)，避免「最後成交價 vs 結算價」混淆

**修改檔案**：`backend/sources/sina.py`

```python
# 移除 GC-F 和 SI-F 的 Sina 來源
# 只保留 USD-TWD 匯率
```

**預期結果**：
- GC-F 和 SI-F 僅由 Yahoo Finance 提供數據
- 週末時只有單一來源，不會有聚合差異

---

### Phase 2: 現貨週末使用單一來源

**目的**：現貨 (XAU-USD, XAG-USD) 在週末時只使用單一權威來源

**修改檔案**：`backend/aggregator.py`

**邏輯**：
```python
if not is_market_open(symbol):
    # 只使用第一個有效來源的價格，不做聚合
    # 優先順序：Yahoo > GoldPrice > 其他
    pass
```

**預期結果**：
- 週末時現貨價格靜止
- 開盤時恢復多來源聚合

---

### Phase 3: USD-TWD 週末使用台灣銀行

**目的**：符合用戶要求，匯率以台灣銀行為準

**修改檔案**：`backend/aggregator.py`

**邏輯**：
```python
if symbol == "USD-TWD" and not is_market_open(symbol):
    # 優先使用台灣銀行的數據
    pass
```

---

### Phase 4: 優化來源優先順序配置

**目的**：讓「週末權威來源」可配置

**新增/修改檔案**：`backend/config.py` 或 `backend/aggregator.py`

**配置結構**：
```python
CLOSED_MARKET_PRIMARY_SOURCE = {
    "XAU-USD": "Yahoo Finance",      # 或 GoldPrice.org
    "XAG-USD": "Yahoo Finance",      # 或 GoldPrice.org
    "GC-F": "Yahoo Finance",         # CME 官方
    "SI-F": "Yahoo Finance",         # CME 官方
    "USD-TWD": "Taiwan Bank",        # 台灣銀行
    "PAXG-USD": None,                # Crypto 24/7，不適用
}
```

---

## 優先順序總結

| 產品 | 開盤時 | 收盤時 |
|------|--------|--------|
| XAU-USD | 多來源聚合 | Yahoo Finance 單一來源 |
| XAG-USD | 多來源聚合 | Yahoo Finance 單一來源 |
| GC-F | Yahoo Finance 單一來源 | Yahoo Finance 單一來源 |
| SI-F | Yahoo Finance 單一來源 | Yahoo Finance 單一來源 |
| USD-TWD | 多來源聚合 | Taiwan Bank 單一來源 |
| PAXG-USD | Binance 單一來源 | Binance 單一來源 (24/7) |

---

## 驗證項目

1. [ ] 週六、週日測試：價格應完全靜止
2. [ ] 週一開盤測試：價格應恢復多來源聚合
3. [ ] 前端顯示：停盤時顯示「停盤(場外交易)」與「上次更新：- 毫秒前」
4. [ ] API 驗證：`/api/v1/latest` 返回 `is_market_open: false`

---

## 預計修改檔案

1. `backend/sources/sina.py` - 移除期貨支援
2. `backend/aggregator.py` - 新增休盤單一來源邏輯
3. `backend/config.py` (可選) - 新增來源優先順序配置

---

## 風險與回滾

- **風險**：若 Yahoo 在週末返回空數據，可能導致無報價
- **緩解**：設置備援邏輯，若主要來源失敗則使用其他來源
- **回滾**：使用 `git revert` 回退相關 commit
