// 数据编辑器组件

import React, { useState, useRef } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Input, 
  Select, 
  Modal, 
  Form, 
  message, 
  Popconfirm,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { DataSet, ColumnInfo } from '../../types';
import { useDataStore } from '../../stores';
import './DataEditor.css';

const { Text } = Typography;
const { Option } = Select;

interface DataEditorProps {
  dataset: DataSet;
  onUpdate?: (dataset: DataSet) => void;
}

interface EditingCell {
  rowIndex: number;
  columnName: string;
  value: any;
}

const DataEditor: React.FC<DataEditorProps> = ({ dataset, onUpdate }) => {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showRowModal, setShowRowModal] = useState(false);
  const [columnForm] = Form.useForm();
  const [rowForm] = Form.useForm();
  const inputRef = useRef<any>(null);
  
  const { 
    AddColumn, 
    DeleteColumn, 
    RenameColumn, 
    AddRow, 
    UpdateRow, 
    DeleteRow 
  } = useDataStore();

  // 开始编辑单元格
  const StartEditCell = (rowIndex: number, columnName: string, currentValue: any) => {
    setEditingCell({ rowIndex, columnName, value: currentValue });
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 100);
  };

  // 保存单元格编辑
  const SaveCellEdit = async () => {
    if (!editingCell) return;

    try {
      const rowData = { [editingCell.columnName]: editingCell.value };
      await UpdateRow(dataset.id, editingCell.rowIndex, rowData);
      setEditingCell(null);
      message.success('数据更新成功');
      onUpdate?.(dataset);
    } catch (error) {
      message.error('更新失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 取消编辑
  const CancelEdit = () => {
    setEditingCell(null);
  };

  // 处理键盘事件
  const HandleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      SaveCellEdit();
    } else if (e.key === 'Escape') {
      CancelEdit();
    }
  };

  // 添加列
  const HandleAddColumn = async (values: any) => {
    try {
      await AddColumn(dataset.id, values.name, values.type);
      setShowColumnModal(false);
      columnForm.resetFields();
      message.success('列添加成功');
      onUpdate?.(dataset);
    } catch (error) {
      message.error('添加列失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 删除列
  const HandleDeleteColumn = async (columnName: string) => {
    try {
      await DeleteColumn(dataset.id, columnName);
      message.success('列删除成功');
      onUpdate?.(dataset);
    } catch (error) {
      message.error('删除列失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 重命名列
  const HandleRenameColumn = async (oldName: string, newName: string) => {
    if (oldName === newName) return;
    
    try {
      await RenameColumn(dataset.id, oldName, newName);
      message.success('列重命名成功');
      onUpdate?.(dataset);
    } catch (error) {
      message.error('重命名失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 添加行
  const HandleAddRow = async (values: any) => {
    try {
      await AddRow(dataset.id, values);
      setShowRowModal(false);
      rowForm.resetFields();
      message.success('行添加成功');
      onUpdate?.(dataset);
    } catch (error) {
      message.error('添加行失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 删除行
  const HandleDeleteRow = async (rowIndex: number) => {
    try {
      await DeleteRow(dataset.id, rowIndex);
      message.success('行删除成功');
      onUpdate?.(dataset);
    } catch (error) {
      message.error('删除行失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 生成表格列配置
  const columns = [
    // 行操作列
    {
      title: '操作',
      key: 'actions',
      width: 80,
      fixed: 'left' as const,
      render: (_: any, __: any, index: number) => (
        <Space size="small">
          <Popconfirm
            title="确认删除此行？"
            onConfirm={() => HandleDeleteRow(index)}
            okText="确认"
            cancelText="取消"
          >
            <Button 
              type="text" 
              danger 
              size="small"
              icon={<DeleteOutlined />}
              disabled={dataset.rows.length <= 1}
            />
          </Popconfirm>
        </Space>
      )
    },
    // 数据列
    ...dataset.columns.map((col: ColumnInfo) => ({
      title: (
        <div className="column-header">
          <Space>
            <span>{col.name}</span>
            <Tag color={GetColumnTypeColor(col.type)}>
              {GetColumnTypeName(col.type)}
            </Tag>
          </Space>
          <Space size="small" className="column-actions">
            <Tooltip title="重命名列">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  const newName = prompt('请输入新的列名:', col.name);
                  if (newName && newName.trim()) {
                    HandleRenameColumn(col.name, newName.trim());
                  }
                }}
              />
            </Tooltip>
            <Popconfirm
              title="确认删除此列？"
              onConfirm={() => HandleDeleteColumn(col.name)}
              okText="确认"
              cancelText="取消"
            >
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                disabled={dataset.columns.length <= 1}
              />
            </Popconfirm>
          </Space>
        </div>
      ),
      dataIndex: col.name,
      key: col.name,
      width: 150,
      render: (value: any, _: any, rowIndex: number) => {
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnName === col.name;
        
        if (isEditing) {
          return (
            <div className="editing-cell">
              {col.type === 'boolean' ? (
                <Select
                  ref={inputRef}
                  value={editingCell.value}
                  onChange={(val) => setEditingCell({...editingCell, value: val})}
                  onBlur={SaveCellEdit}
                  onKeyDown={HandleKeyPress}
                  style={{ width: '100%' }}
                >
                  <Option value={true}>是</Option>
                  <Option value={false}>否</Option>
                </Select>
              ) : col.type === 'number' ? (
                <Input
                  ref={inputRef}
                  type="number"
                  value={editingCell.value}
                  onChange={(e) => setEditingCell({...editingCell, value: Number(e.target.value)})}
                  onBlur={SaveCellEdit}
                  onKeyDown={HandleKeyPress}
                  style={{ width: '100%' }}
                />
              ) : col.type === 'date' ? (
                <Input
                  ref={inputRef}
                  type="date"
                  value={editingCell.value ? new Date(editingCell.value).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditingCell({...editingCell, value: e.target.value})}
                  onBlur={SaveCellEdit}
                  onKeyDown={HandleKeyPress}
                  style={{ width: '100%' }}
                />
              ) : (
                <Input
                  ref={inputRef}
                  value={editingCell.value}
                  onChange={(e) => setEditingCell({...editingCell, value: e.target.value})}
                  onBlur={SaveCellEdit}
                  onKeyDown={HandleKeyPress}
                  style={{ width: '100%' }}
                />
              )}
              <Space className="cell-actions">
                <Button
                  type="text"
                  size="small"
                  icon={<SaveOutlined />}
                  onClick={SaveCellEdit}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={CancelEdit}
                />
              </Space>
            </div>
          );
        }

        return (
          <div 
            className="editable-cell"
            onClick={() => StartEditCell(rowIndex, col.name, value)}
          >
            {RenderCellValue(value, col.type)}
          </div>
        );
      }
    }))
  ];

  const GetColumnTypeColor = (type: string) => {
    switch (type) {
      case 'number': return 'blue';
      case 'date': return 'green';
      case 'boolean': return 'orange';
      default: return 'default';
    }
  };

  const GetColumnTypeName = (type: string) => {
    switch (type) {
      case 'number': return '数值';
      case 'date': return '日期';
      case 'boolean': return '布尔';
      default: return '文本';
    }
  };

  const RenderCellValue = (value: any, type: string) => {
    if (value === null || value === undefined || value === '') {
      return <Text type="secondary">-</Text>;
    }

    switch (type) {
      case 'number':
        return <span style={{ color: '#1677ff' }}>{Number(value).toLocaleString()}</span>;
      case 'date':
        return <span style={{ color: '#52c41a' }}>
          {new Date(value).toLocaleDateString()}
        </span>;
      case 'boolean':
        return <Tag color={value ? 'success' : 'default'}>{value ? '是' : '否'}</Tag>;
      default:
        return <span>{String(value)}</span>;
    }
  };

  // 为新行表单生成字段
  const renderRowFormFields = () => {
    return dataset.columns.map(col => (
      <Form.Item
        key={col.name}
        name={col.name}
        label={col.name}
        rules={[{ required: false }]}
      >
        {col.type === 'boolean' ? (
          <Select placeholder="请选择">
            <Option value={true}>是</Option>
            <Option value={false}>否</Option>
          </Select>
        ) : col.type === 'number' ? (
          <Input type="number" placeholder="请输入数值" />
        ) : col.type === 'date' ? (
          <Input type="date" />
        ) : (
          <Input placeholder="请输入文本" />
        )}
      </Form.Item>
    ));
  };

  return (
    <div className="data-editor">
      {/* 工具栏 */}
      <div className="editor-toolbar">
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowColumnModal(true)}
          >
            添加列
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={() => setShowRowModal(true)}
          >
            添加行
          </Button>
          <Button
            icon={<SettingOutlined />}
            onClick={() => message.info('数据类型转换功能开发中...')}
          >
            数据处理
          </Button>
        </Space>
      </div>

      {/* 数据表格 */}
      <Table
        columns={columns}
        dataSource={dataset.rows.map((row, index) => ({ ...row, key: index }))}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 行，共 ${total} 行`
        }}
        scroll={{ x: 'max-content', y: 400 }}
        size="small"
        bordered
        className="editable-table"
      />

      {/* 添加列模态框 */}
      <Modal
        title="添加新列"
        open={showColumnModal}
        onCancel={() => {
          setShowColumnModal(false);
          columnForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={columnForm}
          layout="vertical"
          onFinish={HandleAddColumn}
        >
          <Form.Item
            name="name"
            label="列名"
            rules={[
              { required: true, message: '请输入列名' },
              { pattern: /^[a-zA-Z\u4e00-\u9fa5][a-zA-Z0-9\u4e00-\u9fa5_]*$/, message: '列名只能包含字母、数字、下划线和中文，且不能以数字开头' }
            ]}
          >
            <Input placeholder="请输入列名" />
          </Form.Item>
          <Form.Item
            name="type"
            label="数据类型"
            rules={[{ required: true, message: '请选择数据类型' }]}
          >
            <Select placeholder="请选择数据类型">
              <Option value="string">文本</Option>
              <Option value="number">数值</Option>
              <Option value="date">日期</Option>
              <Option value="boolean">布尔</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                添加
              </Button>
              <Button onClick={() => {
                setShowColumnModal(false);
                columnForm.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加行模态框 */}
      <Modal
        title="添加新行"
        open={showRowModal}
        onCancel={() => {
          setShowRowModal(false);
          rowForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={rowForm}
          layout="vertical"
          onFinish={HandleAddRow}
        >
          {renderRowFormFields()}
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                添加
              </Button>
              <Button onClick={() => {
                setShowRowModal(false);
                rowForm.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DataEditor;
