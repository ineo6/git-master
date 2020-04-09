import 'jquery';
import 'jquery-ui/ui/widgets/resizable';
import GitHelper from './main';
import '../common/styles/octotree.less';
import '../common/libs/file-icons.less';
import '../common/libs/jstree.css';
import './index.less';

const gitMaster = new GitHelper();

gitMaster.run();
