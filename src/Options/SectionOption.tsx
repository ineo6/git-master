import * as React from 'react';
import classNames from 'classnames';

import './section.less';

export type SectionOptionLayout = 'horizontal' | 'vertical';

interface SectionOptionProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  layout?: SectionOptionLayout;
}

interface SectionOptionState {
}

class SectionOption extends React.Component<SectionOptionProps, SectionOptionState> {
  state = {};

  render() {
    const { title, description, layout = 'vertical', children } = this.props;

    const prefixCls = 'section';

    return (
      <div
        className={
          classNames(
            `${prefixCls}-option`,
            {
              [`${prefixCls}-option-${layout}`]: true,
              [`${prefixCls}-option-hasDesc`]: description,
            },
          )
        }
      >
        <div className="label">
          {title}
          <div className="desc">{description}</div>
        </div>
        <div className="action-area">
          {children}
        </div>
      </div>
    );
  }
}

export default SectionOption;
