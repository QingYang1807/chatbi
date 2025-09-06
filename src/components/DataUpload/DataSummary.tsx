// 数据摘要组件

import React, { useMemo } from 'react';
import { Collapse, Descriptions, Tag, Progress, Alert } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { DataSet } from '../../types';
import { dataService } from '../../services/dataService';
import './DataSummary.css';

const { Panel } = Collapse;

interface DataSummaryProps {
  dataset: DataSet;
}

const DataSummary: React.FC<DataSummaryProps> = ({ dataset }) => {
  // 获取数据统计信息
  const stats = useMemo(() => {
    return dataService.GetDatasetStats(dataset);
  }, [dataset]);

  const summary = dataset.summary;

  const GetDataQualityScore = () => {
    const totalCells = summary.totalRows * summary.totalColumns;
    const validCells = totalCells - summary.missingValues;
    const qualityScore = totalCells > 0 ? (validCells / totalCells) * 100 : 0;
    return Math.round(qualityScore);
  };

  const GetQualityColor = (score: number) => {
    if (score >= 90) return '#52c41a';
    if (score >= 70) return '#faad14';
    return '#ff4d4f';
  };

  const qualityScore = GetDataQualityScore();

  return (
    <div className="data-summary">
      <Collapse ghost>
        <Panel 
          header={
            <div className="summary-header">
              <BarChartOutlined />
              <span>数据统计详情</span>
            </div>
          } 
          key="summary"
        >
          {/* 数据质量评分 */}
          <div className="quality-section">
            <h4>数据质量评分</h4>
            <Progress
              type="circle"
              percent={qualityScore}
              strokeColor={GetQualityColor(qualityScore)}
              size={100}
              format={(percent) => `${percent}分`}
            />
            <div className="quality-details">
              <p>• 完整性：{summary.missingValues === 0 ? '优秀' : '需要关注'}</p>
              <p>• 唯一性：{summary.duplicateRows === 0 ? '无重复' : `${summary.duplicateRows}行重复`}</p>
            </div>
          </div>

          {/* 基础统计 */}
          <Descriptions title="基础信息" bordered size="small" column={2}>
            <Descriptions.Item label="数据行数">{summary.totalRows.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="数据列数">{summary.totalColumns}</Descriptions.Item>
            <Descriptions.Item label="数值字段">{summary.numericColumns}</Descriptions.Item>
            <Descriptions.Item label="文本字段">{summary.stringColumns}</Descriptions.Item>
            <Descriptions.Item label="日期字段">{summary.dateColumns}</Descriptions.Item>
            <Descriptions.Item label="缺失值">{summary.missingValues}</Descriptions.Item>
            <Descriptions.Item label="重复行">{summary.duplicateRows}</Descriptions.Item>
            <Descriptions.Item label="上传时间">{dataset.uploadTime.toLocaleString()}</Descriptions.Item>
            {dataset.sheets && dataset.sheets.length > 1 && (
              <Descriptions.Item label="工作表数量" span={2}>
                <Tag color="cyan">{dataset.sheets.length} 个工作表</Tag>
                {dataset.activeSheetIndex !== undefined && (
                  <Tag color="blue">当前: {dataset.sheets[dataset.activeSheetIndex]?.name}</Tag>
                )}
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* Excel工作表详情 */}
          {dataset.sheets && dataset.sheets.length > 1 && (
            <div className="sheets-section">
              <h4>工作表详情</h4>
              <div className="sheets-list">
                {dataset.sheets.map((sheet, index) => (
                  <div 
                    key={sheet.name} 
                    className={`sheet-item ${index === dataset.activeSheetIndex ? 'active' : ''}`}
                  >
                    <div className="sheet-header">
                      <span className="sheet-name">{sheet.name}</span>
                      {index === dataset.activeSheetIndex && (
                        <Tag color="blue" size="small">当前</Tag>
                      )}
                    </div>
                    <div className="sheet-stats">
                      <Tag>{sheet.summary.totalRows} 行</Tag>
                      <Tag>{sheet.summary.totalColumns} 列</Tag>
                      <Tag color="green">{sheet.summary.numericColumns} 数值列</Tag>
                      <Tag color="orange">{sheet.summary.stringColumns} 文本列</Tag>
                      {sheet.summary.dateColumns > 0 && (
                        <Tag color="purple">{sheet.summary.dateColumns} 日期列</Tag>
                      )}
                    </div>
                    {sheet.summary.missingValues > 0 && (
                      <div className="sheet-warnings">
                        <Tag color="warning" size="small">
                          {sheet.summary.missingValues} 个缺失值
                        </Tag>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* 数据来源分布 */}
              <div className="data-distribution">
                <h5>数据来源分布</h5>
                {(() => {
                  const distribution = dataService.GetSheetDataStats(dataset);
                  return Object.entries(distribution).map(([sheetName, stats]) => (
                    <div key={sheetName} className="distribution-item">
                      <span className="sheet-name">{sheetName}</span>
                      <div className="progress-container">
                        <Progress 
                          percent={stats.percentage} 
                          size="small" 
                          showInfo={false}
                          strokeColor="#1677ff"
                        />
                        <span className="stats-text">
                          {stats.count.toLocaleString()} 行 ({stats.percentage}%)
                        </span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* 字段详情 */}
          <div className="columns-section">
            <h4>字段详情</h4>
            <div className="columns-list">
              {dataset.columns.map((column) => (
                <div key={column.name} className="column-item">
                  <div className="column-header">
                    <span className="column-name">{column.name}</span>
                    <Tag color={GetColumnTypeColor(column.type)}>
                      {GetColumnTypeName(column.type)}
                    </Tag>
                  </div>
                  <div className="column-meta">
                    {column.nullable && <Tag>可为空</Tag>}
                    {column.unique && <Tag color="success">唯一</Tag>}
                  </div>
                  {column.examples.length > 0 && (
                    <div className="column-examples">
                      <span>示例值：</span>
                      {column.examples.slice(0, 3).map((example, index) => (
                        <Tag key={index} color="blue">
                          {String(example)}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 数值字段统计 */}
          {Object.keys(stats).length > 0 && (
            <div className="stats-section">
              <h4>数值字段统计</h4>
              {Object.entries(stats).map(([fieldName, fieldStats]) => {
                if (typeof fieldStats === 'object' && 'min' in fieldStats) {
                  return (
                    <Descriptions 
                      key={fieldName}
                      title={fieldName}
                      bordered 
                      size="small" 
                      column={3}
                      style={{ marginBottom: 16 }}
                    >
                      <Descriptions.Item label="最小值">{fieldStats.min}</Descriptions.Item>
                      <Descriptions.Item label="最大值">{fieldStats.max}</Descriptions.Item>
                      <Descriptions.Item label="平均值">{fieldStats.avg.toFixed(2)}</Descriptions.Item>
                      <Descriptions.Item label="总和">{fieldStats.sum}</Descriptions.Item>
                      <Descriptions.Item label="计数">{fieldStats.count}</Descriptions.Item>
                    </Descriptions>
                  );
                }
                return null;
              })}
            </div>
          )}

          {/* 数据质量提醒 */}
          {(summary.missingValues > 0 || summary.duplicateRows > 0) && (
            <Alert
              message="数据质量提醒"
              description={
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {summary.missingValues > 0 && (
                    <li>发现 {summary.missingValues} 个缺失值，可能影响分析结果</li>
                  )}
                  {summary.duplicateRows > 0 && (
                    <li>发现 {summary.duplicateRows} 行重复数据，建议清理后再分析</li>
                  )}
                </ul>
              }
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Panel>
      </Collapse>
    </div>
  );

  function GetColumnTypeColor(type: string) {
    switch (type) {
      case 'number': return 'blue';
      case 'date': return 'green';
      case 'boolean': return 'orange';
      default: return 'default';
    }
  }

  function GetColumnTypeName(type: string) {
    switch (type) {
      case 'number': return '数值';
      case 'date': return '日期';
      case 'boolean': return '布尔';
      default: return '文本';
    }
  }
};

export default DataSummary;
