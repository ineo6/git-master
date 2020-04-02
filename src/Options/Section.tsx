import * as React from 'react';

import './section.less';

interface SectionProps {
  title?: React.ReactNode;
}

interface SectionState {
}

class Section extends React.Component<SectionProps, SectionState> {
  render() {
    const { title, children } = this.props;

    return (
      <div className="section">
        <div className="section-title">{title}</div>
        <div className="section-content">
          {children}
        </div>
      </div>
    );
  }
}

export default Section;
