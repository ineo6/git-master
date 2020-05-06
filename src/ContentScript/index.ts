import 'jquery';
import 'jquery-ui/ui/widgets/resizable';
import 'whatwg-fetch';
import GitMaster from './PageLife/core/GitMaster';
import '../common/styles/octotree.less';
import '@ineo6/file-icons/index.less';
import '../common/libs/jstree.css';
import './index.less';
import './ui/toast';
import './ui/toast/index.less';
import './ui/toast/toast';

const gitMaster = new GitMaster();

gitMaster.init();
