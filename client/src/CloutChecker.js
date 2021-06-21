import React from 'react';
import { Tweet } from 'react-twitter-widgets';
import AsyncSelect from 'react-select/async';
import 'bootstrap/dist/css/bootstrap.min.css'
import { Form, Button, Container, Col, Row, Card, Table, Spinner, Alert, Overlay, Tooltip } from 'react-bootstrap'

const DATE_OPTIONS = {
  year: 'numeric', month: 'numeric', day: 'numeric',
  hour: 'numeric', minute: 'numeric',
  hour12: false
};

class TweetForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {tweetId: '', status: ''};

    this.handleChange = this.handleChange.bind(this);
    this.onTweetLoad = this.onTweetLoad.bind(this);
  }

  handleChange(event) {
    let tweetIdOrUrl = event.target.value;
    this.setState({status: "loading"});
    if (tweetIdOrUrl.includes("twitter.com") && tweetIdOrUrl.includes("status")) {
      try {
        tweetIdOrUrl = tweetIdOrUrl.split("status/")[1].split("?")[0];
        this.setState({tweetId: tweetIdOrUrl});
      }
      catch(err) {
        this.setState({tweetId: '', status: 'invalidInput'});
        this.props.updateDate('');
      }
    } else if (tweetIdOrUrl == '') {
      this.setState({tweetId: '', status: null});
      this.props.updateDate('');
    } else if (!isNaN(tweetIdOrUrl)) {
      this.setState({tweetId: tweetIdOrUrl});
    } else {
      this.setState({tweetId: '', status: 'invalidInput'});
      this.props.updateDate('');
    }
  }

  onTweetLoad() {
    fetch(`/api/tweet/${this.state.tweetId}`)
      .then(response => response.json())
      .then(json => {
        this.setState({status: null});
        this.props.updateDate(json.data.created_at);
      })
      .catch(error => console.log(error));
  }

  render() {
    let status = null;
    if (this.state.status === 'loading') {
      status = <div><Spinner animation="border"></Spinner></div>;
    } else if (this.state.status === 'invalidInput') {
      status = <Alert variant="danger">Invalid input.</Alert>
    }
    return (
      <div>
        <Form>
          <Form.Group controlId="formTweet">
            <Form.Label>Tweet ID or URL</Form.Label>
            <Form.Control
              onChange={this.handleChange}
              placeholder="Paste paste tweet ID or URL here">
            </Form.Control>
          </Form.Group>
        </Form>
        {status}
        { this.state.tweetId &&
          <EmbeddedTweet tweedId={this.state.tweetId} onTweetLoad={this.onTweetLoad}>
          </EmbeddedTweet>}
      </div>
    );
  }
}

class EmbeddedTweet extends React.Component {

  render() {
    return (
      <Tweet
        tweetId={this.props.tweedId}
        renderError={(_err) => <Alert variant="danger">Invalid tweet ID provided.</Alert>}
        onLoad={this.props.onTweetLoad}>
      </Tweet>
    );
  } 
}

class CoinForm extends React.Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.state = {coinList: [], selectedCoin: ''};
    this.filterCoins = this.filterCoins.bind(this);
    this.promiseOptions = this.promiseOptions.bind(this);
  }

  componentDidMount() {
    fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false")
      .then(response => response.json())
      .then(json => {
        let coinList = json.map(x => ({ value: x.id, label: `${x.symbol.toUpperCase()} (${x.name})`}));
        this.setState({coinList});
      })
      .catch(error => console.log(error));
  }

  handleChange(e) {
    this.props.onCoinChange(e.value);
    this.setState({selectedCoin: e.value});
  }

  filterCoins(inputValue) {
    return this.state.coinList.filter(i => i.label.toLowerCase().includes(inputValue.toLowerCase()));
  }

  promiseOptions(inputValue) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(this.filterCoins(inputValue));
      }, 250);
    });
  }

  render() {
    return (
      <Form onSubmit={this.props.handleSubmit}>
        <Form.Group controlId="formCoin">
          <Form.Label>Crypto</Form.Label>
          <AsyncSelect
            cacheOptions
            defaultOptions={this.state.coinList}
            placeholder='Start typing to search...' 
            loadOptions={this.promiseOptions}
            onChange={this.handleChange}
          />
        </Form.Group>
        <Button variant="primary" type="submit"
                disabled={!this.props.date || !this.state.selectedCoin}>Submit</Button>
    </Form>
    );
  }
}

export class CloutChecker extends React.Component {
  constructor(props) {
    super(props);
    this.handleCoinChange = this.handleCoinChange.bind(this);
    this.updateDate = this.updateDate.bind(this);
    this.getCoinReturn = this.getCoinReturn.bind(this);
    this.state = {
      date: '',
      coin: '',
      coinReturnStats: null
    };
  }

  handleCoinChange(coin) {
    this.setState({coin});
  }

  updateDate(date) {
    this.setState({date: (new Date(date)).getTime()});
    this.setState({coinReturnStats: null});
  }

  getCoinReturn(e) {
    e.preventDefault();
    this.setState({coinReturnStats: 'loading'});
    fetch(`/api/coinPerformance/${this.state.coin}/${this.state.date}`)
      .then(response => response.json())
      .then(json => {
        this.setState({
          coinReturnStats: json
        })
      })
      .catch(error => console.log(error));
  }

  render() {
    let coinReturn = <div></div>;
    if (this.state.coinReturnStats === 'loading') {
      coinReturn = <div><Spinner animation="border" className="mt-3"></Spinner></div>
    } else if (this.state.coinReturnStats != null) {
      let peakRow = <tr key="peak">
        <td>Peak Since Tweet</td>
        <td>
          {new Intl.DateTimeFormat('en-US', DATE_OPTIONS).format(
            new Date(this.state.coinReturnStats.peak.timeStamp))}
        </td>
        <td>{this.state.coinReturnStats.peak.price > 1 ? this.state.coinReturnStats.peak.price.toFixed(2): this.state.coinReturnStats.peak.price}</td>
        <td>
          <b style={{color: (this.state.coinReturnStats.peak.price/this.state.coinReturnStats.start.price-1)>0 ? "green" : "red"}}>
            {((this.state.coinReturnStats.peak.price/this.state.coinReturnStats.start.price-1)*100).toFixed(1)}%
          </b>
        </td>
      </tr>
      let troughRow = <tr key="trough">
        <td>Trough Since Tweet</td>
        <td>
          {new Intl.DateTimeFormat('en-US', DATE_OPTIONS).format(
            new Date(this.state.coinReturnStats.trough.timeStamp))}
        </td>
        <td>{this.state.coinReturnStats.trough.price > 1 ? this.state.coinReturnStats.trough.price.toFixed(2): this.state.coinReturnStats.trough.price}</td>
        <td>
          <b style={{color: (this.state.coinReturnStats.trough.price/this.state.coinReturnStats.start.price-1)>0 ? "green" : "red"}}>
            {((this.state.coinReturnStats.trough.price/this.state.coinReturnStats.start.price-1)*100).toFixed(1)}%
          </b>
        </td>
      </tr>
      let peakAndTroughRows = this.state.coinReturnStats.peak.timeStamp > this.state.coinReturnStats.trough.timeStamp ?
        [troughRow, peakRow] : [peakRow, troughRow]
      coinReturn = <Card className="mt-3">
        <Card.Header as ="h5">Return Stats</Card.Header>
        <Card.Body>
          <Table bordered hover striped>
            <thead>
              <tr>
                <th></th>
                <th>Date</th>
                <th>Price</th>
                <th>%</th>
              </tr>
              </thead>
            <tbody>
              <tr key="atTweet">
                <td>At Tweet</td>
                <td>
                  {new Intl.DateTimeFormat('en-US', DATE_OPTIONS).format(
                    new Date(this.state.coinReturnStats.start.timeStamp))}
                </td>
                <td>{this.state.coinReturnStats.start.price > 1 ? this.state.coinReturnStats.start.price.toFixed(2): this.state.coinReturnStats.start.price}</td>
                <td>-</td>
              </tr>
              {peakAndTroughRows}
              <tr key="now">
                <td>Now(ish)</td>
                <td>
                  {new Intl.DateTimeFormat('en-US', DATE_OPTIONS).format(
                    new Date(this.state.coinReturnStats.end.timeStamp))}
                </td>
                <td>{this.state.coinReturnStats.end.price > 1 ? this.state.coinReturnStats.end.price.toFixed(2): this.state.coinReturnStats.end.price}</td>
                <td>
                  <b style={{color: (this.state.coinReturnStats.end.price/this.state.coinReturnStats.start.price-1)>0 ? "green" : "red"}}>
                    {((this.state.coinReturnStats.end.price/this.state.coinReturnStats.start.price-1)*100).toFixed(1)}%
                  </b>
                </td>
              </tr>
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    }
    return (
      <Container>
        <h1 className="mt-3">Clout Checker</h1>
        <h5>View a crypto's returns since a tweet.</h5>
        <br></br>
        <Row>
          <Col md>
            <TweetForm updateDate={this.updateDate}></TweetForm>
          </Col>
          <Col md>
            <CoinForm
              onCoinChange={this.handleCoinChange}
              handleSubmit={this.getCoinReturn}
              date={this.state.date}>
            </CoinForm>
            {coinReturn}
          </Col>
        </Row>
        <Row>
          <Col>
            <br></br>
            <p style={{fontSize: "14px"}}>* Pricing data is sourced from <a href="https://www.coingecko.com/en">CoinGecko</a>. The top 250 coins by market cap are available in this app.</p>
          </Col>
        </Row>
      </Container>
    );
  }
}