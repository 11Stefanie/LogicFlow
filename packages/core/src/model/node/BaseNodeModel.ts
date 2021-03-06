import {
  observable, action, toJS, isObservable,
} from 'mobx';
import { assign, pick } from 'lodash-es';
import { createUuid } from '../../util/uuid';
import { defaultTheme } from '../../constant/DefaultTheme';
import {
  ElementState, ModelType, ElementMaxzIndex, ElementType,
} from '../../constant/constant';
import {
  AdditionData, NodeData, MenuConfig, NodeAttribute,
} from '../../type';
import { IBaseModel } from '../BaseModel';

const defaultConfig = assign(
  {
    x: 0,
    y: 0,
    text: {
      value: '',
      x: 0,
      y: 0,
      draggable: false,
    },
  },
  defaultTheme.rect,
  defaultTheme.circle,
);

export type ConnectRule = {
  message: string;
  validate: (source: BaseNodeModel, target: BaseNodeModel) => boolean;
};

export type ConnectRuleResult = {
  isAllPass: boolean;
  msg?: string;
};

export { BaseNodeModel };
export default class BaseNodeModel implements IBaseModel {
  readonly id = createUuid();
  readonly BaseType = ElementType.NODE;
  modelType = ModelType.NODE;
  additionStateData: AdditionData;
  menu?: MenuConfig;
  targetRules: ConnectRule[] = [];
  sourceRules: ConnectRule[] = [];
  @observable properties = {};
  @observable type = '';
  @observable x = defaultConfig.x;
  @observable y = defaultConfig.y;
  @observable width = defaultConfig.width;
  @observable height = defaultConfig.height;
  @observable fill = defaultConfig.fill;
  @observable fillOpacity = defaultConfig.fillOpacity;
  @observable strokeWidth = defaultConfig.strokeWidth;
  @observable stroke = defaultConfig.stroke;
  @observable strokeOpacity = defaultConfig.strokeOpacity;
  @observable opacity = defaultConfig.opacity;
  @observable outlineColor = defaultConfig.outlineColor;
  @observable isSelected = false;
  @observable isHovered = false;
  @observable isHitable = true; // 细粒度控制节点是否对用户操作进行反应
  @observable isContextMenu = false;
  @observable zIndex = 1;
  @observable anchors = [];
  @observable activeAnchor = -1;
  @observable state = 1;
  @observable text = defaultConfig.text;

  constructor(data) {
    this.formatText(data);
    if (!data.properties) {
      data.properties = {};
    }
    // todo: 规范所有的初始化参数，pick需要的参数
    assign(this, data);
  }

  // 格式化text参数，未修改observable不作为action
  formatText(data): void {
    if (!data.text) {
      data.text = {
        value: '',
        x: data.x,
        y: data.y,
        draggable: false,
      };
    }
    if (data.text && typeof data.text === 'string') {
      data.text = {
        value: data.text,
        x: data.x,
        y: data.y,
        draggable: false,
      };
    }
  }

  /**
   * 保存时获取的数据
   */
  getData(): NodeData {
    const { x, y, value } = this.text;
    let { properties } = this;
    if (isObservable(properties)) {
      properties = toJS(properties);
    }
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
      text: {
        x,
        y,
        value,
      },
      properties,
    };
  }

  getProperties() {
    return toJS(this.properties);
  }

  /**
   * 在连线的时候，是否允许这个节点为source节点，连线到target节点。
   */
  isAllowConnectedAsSource(target: BaseNodeModel): ConnectRuleResult {
    const rules = this.getConnectedSourceRules();
    let isAllPass = true;
    let msg: string;
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (!rule.validate.call(this, this, target)) {
        isAllPass = false;
        msg = rule.message;
        break;
      }
    }
    return {
      isAllPass,
      msg,
    };
  }

  /**
   * 获取当前节点作为连接的起始节点规则。
   */
  getConnectedSourceRules(): ConnectRule[] {
    return this.sourceRules;
  }
  /**
   * 在连线的时候，是否允许这个节点未target节点
   */

  isAllowConnectedAsTarget(source: BaseNodeModel): ConnectRuleResult {
    const rules = this.getConnectedTargetRules();
    let isAllPass = true;
    let msg: string;
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (!rule.validate.call(this, source, this)) {
        isAllPass = false;
        msg = rule.message;
        break;
      }
    }
    return {
      isAllPass,
      msg,
    };
  }

  getConnectedTargetRules(): ConnectRule[] {
    return this.targetRules;
  }

  @action
  move(deltaX, deltaY): void {
    this.x += deltaX;
    this.y += deltaY;
    this.text && this.moveText(deltaX, deltaY);
  }

  @action
  moveTo(x, y): void {
    if (this.text) {
      const deltaX = x - this.x;
      const deltaY = y - this.y;
      this.text && this.moveText(deltaX, deltaY);
    }
    this.x = x;
    this.y = y;
  }

  @action
  moveText(deltaX, deltaY): void {
    const {
      x,
      y,
      value,
      draggable,
    } = this.text;
    this.text = {
      value,
      draggable,
      x: x + deltaX,
      y: y + deltaY,
    };
  }

  @action
  updateText(value: string): void {
    this.text.value = value;
  }

  @action
  setSelected(flag = true, zIndexFlag = true): void {
    this.isSelected = flag;
    if (zIndexFlag) {
      this.zIndex = this.isSelected ? ElementMaxzIndex : 1;
    }
  }

  @action
  setHovered(flag = true): void {
    this.isHovered = flag;
  }

  @action
  setHitable(flag = true): void {
    this.isHitable = flag;
  }

  @action
  setAnchorActive(index: number): void {
    this.activeAnchor = index;
  }

  @action
  setElementState(state: ElementState, additionStateData?: AdditionData): void {
    this.state = state;
    this.additionStateData = additionStateData;
  }

  @action
  showMenu(flag = true): void {
    this.isContextMenu = flag;
  }

  @action
  updateStroke(color): void {
    this.stroke = color;
  }

  /* 更新数据 */
  @action
  updateData(nodeAttribute: NodeAttribute): void {
    const nodeData = pick(nodeAttribute, 'type', 'x', 'y', 'text', 'properties');
    assign(this, nodeData);
  }

  @action
  setProperty(key, val): void {
    this.properties[key] = val;
  }

  @action
  setProperties(properties): void {
    this.properties = Object.assign(this.properties, properties);
  }

  @action
  setStyleFromTheme(type, graphModel): void {
    const { theme } = graphModel;
    if (theme[type]) {
      assign(this, theme[type]);
    }
  }
}
