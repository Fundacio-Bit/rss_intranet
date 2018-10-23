import React, { Component } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableRow from '@material-ui/core/TableRow'
import TableCell from '@material-ui/core/TableCell'
import NewsTableRow from './news-table-row'
import NewsTableHead from './news-table-head'
import Paper from '@material-ui/core/Paper';
import TablePagination from '@material-ui/core/TablePagination'
import RSSSnackbarContent from './rss-snackbar-content'

const styles = theme => ({
  root: {
    width: '100%',
    marginTop: theme.spacing.unit * 3,
    overflowX: 'auto',
  },
  table: {
    minWidth: 700,
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  input: {
    display: 'none',
  },
  margin: {
    margin: theme.spacing.unit,
  },
});


var desc = (a, b, orderBy) => {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}


var getSorting = (orderBy, order) => {
  return order === 'desc' ? (a, b) => desc(a, b, orderBy) : (a, b) => -desc(a, b, orderBy);
};


class NewsTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      order: 'desc',
      orderBy: 'published',  
      data: [],
      page: 0,
      rowsPerPage: 5
    };
    // This binding is necessary to make `this` work in the callback
    this.handleChangePage = this.handleChangePage.bind(this);
    this.handleChangeRowsPerPage = this.handleChangeRowsPerPage.bind(this);
    this.filterByDate = this.filterByDate.bind(this);
    this.filterByChecked = this.filterByChecked.bind(this);
    this.filterByTopic = this.filterByTopic.bind(this);
    this.filterBySearchTerm = this.filterBySearchTerm.bind(this);
    // this.getSorting = this.getSorting.bind(this);
  }

  // Callback that ensures that teh API calls done by this component are executed once it is mounted. 
  componentDidMount() {
    this.retrievedDocumentsList();
  }

  // Call the REST API to get all documents
  retrievedDocumentsList() {
    axios.get('/rss-news/entries')
    .then((results) => {this.setState({data: results.data.results})});      
  }

  handleChangePage(event, page) {
    this.setState({ page });
  };

  handleChangeRowsPerPage(event) {
    this.setState({ rowsPerPage: event.target.value });
  };
  
  handleDeleteClick(id) {
    const retrievedNews = this.state.data;
    const index = retrievedNews.findIndex(x => x._id == id);
    const removed_new = retrievedNews[index]
    axios.post('/rss-news/news/', 
                removed_new, 
                {headers: {'Content-Type': 'application/json' }}
    ).then((res) => {
        console.log(res)
        // axios.delete('/rss-news/identifier/', {params: {'documentId': id}})
        axios.delete('/rss-news/identifier/'+ id)
        .then((res) => {
              console.log(res);
            // we can update the state after response...
            retrievedNews.splice(index, 1);
            this.setState({data:retrievedNews});
        })  
    })
  }

  handleDeleteTopic(id, topic) {
    let retrievedNews = this.state.data;
    const index = retrievedNews.findIndex(x => x._id == id);
    let updatedNew = retrievedNews[index]
    let updatedTopicsArray = updatedNew.topics.split(",");
    let updatedTopicsString = updatedTopicsArray.filter(u => u !== topic).join();
    // Send "void_topics_string" instead of an empty string (which would crash) 
    if (updatedTopicsString === ""){updatedTopicsString = "void_topics_string"}       
    // TODO: update via POST instead of via put to avoid problems with long URLS and with special chars
    axios.put('/rss-news/identifier/'+ id +'/topics/' + updatedTopicsString )
    .then((res) => {
        console.log(res)
        // Show an empty string when updatedTopicsString value is "void_topics_string"
        retrievedNews[index].topics = updatedTopicsString === "void_topics_string"? "" : updatedTopicsString;
        // we can update the state after response...
        this.setState({data:retrievedNews});
    })
  }


  // TODO: manage handleAddTopic and handleDeleteTopic with a unique function
  // TODO: handle the addition of topics with special chars or commas. Also avoid duplicates.
  handleAddTopic(id, topic) {
    let retrievedNews = this.state.data;
    const index = retrievedNews.findIndex(x => x._id == id);
    let updatedNew = retrievedNews[index]
    // let updatedTopicsArray = updatedNew.topics.split(",");
    let updatedTopicsArray = updatedNew.hasOwnProperty("topics")? updatedNew.topics.split(",") : [];    
    updatedTopicsArray.push(topic.toLowerCase());
    const uniqueTopics = [...new Set(updatedTopicsArray)]
    // remove empty elements and transform to string
    const updatedTopicsString = uniqueTopics.filter(u => u !== "").join();
    // TODO: update via POST instead of via put to avoid problems with long URLS and with special chars
    axios.put('/rss-news/identifier/'+ id +'/topics/' + updatedTopicsString )
    .then((res) => {
        console.log(res)
        retrievedNews[index].topics = updatedTopicsString;
        // we can update the state after response...
        this.setState({data:retrievedNews});
    })
  }

  handleSelectedChange(event, id) {
    const value = event.target.checked;
    const retrievedNews = this.state.data;
    const index = retrievedNews.findIndex(x => x._id == id);
    axios.put('/rss-news/identifier/'+ id +'/selected/' + value )
    .then((res) => {
        console.log(res)
        retrievedNews[index].selected = value;
        // we can update the state after response...
        this.setState({data:retrievedNews});
    })
  }

  handleRequestSort (orderBy, order, event) {
    // const orderBy = property;
    var order = 'desc';

    if (this.state.orderBy === orderBy && this.state.order === 'desc') {
      order = 'asc';
    }

    this.setState({
      order,
      orderBy
    });
  };

  filterByDate(pressNew) {
    if (pressNew.published.includes(this.props.selectedDate)) {
      return true
    } else return false
  };

  filterByChecked(pressNew){
    var value = 0;
    if (this.props.isChecked === 1){
      value = true
    } else if (this.props.isChecked === -1) {
      value = false
    }
    if (value === 0 || pressNew.selected === value) {
      return true
    } else return false
  }

  filterByTopic(pressNew) {
    if (
      pressNew.topics.toLowerCase().split(",").includes(this.props.searchTerm.toLowerCase().slice(1, -1))){
        return true
      }
    else return false
  };


  // TODO: add search in full text
  filterBySearchTerm(pressNew) {
    if (
      this.props.searchTerm === "" ||
      pressNew.title.toLowerCase().indexOf(this.props.searchTerm.toLowerCase())!== -1) {return true}
    else return false
  };


  render () {
      const { classes } = this.props;
      const { data, order, orderBy, rowsPerPage, page } = this.state;
      const all = [5,10,25,(data.length)];
      const emptyRows = rowsPerPage - Math.min(rowsPerPage, data.length - page * rowsPerPage);
      
      // Filtering data
      var filteredData = data
      if (this.props.selectedDate) {
        filteredData = data.filter(this.filterByDate);
      } 
      if (this.props.isChecked) {
        filteredData = filteredData.filter(this.filterByChecked);
      } 
      if (/\[*\]/.test(this.props.searchTerm)){
        filteredData = filteredData.filter(this.filterByTopic);
      } else {
        filteredData = filteredData.filter(this.filterBySearchTerm);
      }

      // Sorting data
      filteredData.sort(getSorting(orderBy, order));

      var handleSelectedChange = this.handleSelectedChange;
      var handleDeleteClick = this.handleDeleteClick;
      var handleRequestSort = this.handleRequestSort;
      var handleDeleteTopic = this.handleDeleteTopic;
      var handleAddTopic = this.handleAddTopic;

      return (
        <Paper className={classes.root}>
          <div className={classes.tableWrapper}>
            <Table className={classes.table} aria-labelledby="tableTitle">
              {filteredData.length > 0 && (
                <NewsTableHead
                  order = { order }
                  orderBy = { orderBy }
                  onRequestSort = { handleRequestSort.bind(this) }
                />
              )}
              <TableBody>
              {filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(u => {
                console.log(u)                
                return (                    
                  <NewsTableRow
                  //TODO:check what are keys for. They should be unique and cannot be rendered in the DOM
                  // using prop.key
                    key={u._id}
                    published={u.published}
                    selected={u.selected}
                    docId={u._id}
                    title={u.title}
                    // topics={u.topics.split(",")}
                    topics={u.hasOwnProperty("topics")? u.topics.split(",") : []}
                    link={u.link}
                    summary={u.summary}
                    handleSelectedChange = {handleSelectedChange.bind(this)}
                    handleDeleteClick = {handleDeleteClick.bind(this)}
                    handleDeleteTopic = {handleDeleteTopic.bind(this)}
                    handleAddTopic = {handleAddTopic.bind(this)}
                  />
                );
              })} 
              {filteredData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <RSSSnackbarContent
                      variant="info"
                      className={classes.margin}
                      message="No hay datos para esta fecha!"
                    />
                  </TableCell>
                </TableRow>
              )}
              {emptyRows > 0 && (
                <TableRow style={{ height: 49 * emptyRows }}>
                  <TableCell colSpan={4} />
                </TableRow>
              )}
              </TableBody>
            </Table>
          </div>
          {filteredData.length > 0 && (
            <TablePagination
              component="div"
              count={filteredData.length}
              rowsPerPage={rowsPerPage}
              page={page}
              backIconButtonProps={{
                'aria-label': 'Previous Page',
              }}
              nextIconButtonProps={{
                'aria-label': 'Next Page',
              }}
              onChangePage={this.handleChangePage}
              onChangeRowsPerPage={this.handleChangeRowsPerPage}
              rowsPerPageOptions={all}
            />
          )}
        </Paper>
      );
    }
  }

  NewsTable.propTypes = {
    classes: PropTypes.object.isRequired,
  };

  export default withStyles(styles)(NewsTable);